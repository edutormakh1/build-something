import { mkdtemp, mkdir, readFile, rm, writeFile, access, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runPreview, previewSettings, previewOrigins, safeEnvironment } from "../scripts/cloudflare-preview.mjs";
import { validateRecoveryRedirect } from "../scripts/smoke-cloudflare-preview.mjs";

let root: string;
let calls: { args: string[]; options: { cwd: string; env: Record<string, string> } }[];
let source = "accepted-source";
const sourceState = async () => source;
const appDir = () => path.join(root, "apps/people");
const marker = () => path.join(appDir(), ".open-next/preview-build.json");
async function exists(file: string) { try { await access(file); return true; } catch { return false; } }
async function configChange(change: (c: ReturnType<typeof previewSettings>) => void) {
  const file = path.join(appDir(), "wrangler.preview.jsonc"); const c = JSON.parse(await readFile(file, "utf8")); change(c);
  await writeFile(file, JSON.stringify(c));
}
async function run(_command: string, args: string[], options: { cwd: string; env: Record<string, string> }) {
  calls.push({ args, options });
  if (args.includes("build")) {
    await mkdir(path.join(appDir(), ".open-next/.build"), { recursive: true });
    await mkdir(path.join(appDir(), ".open-next/assets/cdn-cgi/_next_cache"), { recursive: true });
    await writeFile(path.join(appDir(), ".open-next/worker.js"), "export default {};");
    await writeFile(path.join(appDir(), ".open-next/assets/chunk.js"), "fixture bytes");
    await symlink("chunk.js", path.join(appDir(), ".open-next/assets/internal-link.js"));
    await mkdir(path.join(appDir(), ".open-next/cloudflare"), { recursive: true });
    await writeFile(path.join(appDir(), ".open-next/cloudflare/init.js"), "const settings = { __ASSETS_RUN_WORKER_FIRST__: true };");
    await writeFile(path.join(appDir(), ".open-next/.build/open-next.config.edge.mjs"), 'const section = {override:{incrementalCache:()=>({name:"cf-static-assets-incremental-cache"})}}; export default {default:section,middleware:section};');
  }
}
const options = () => ({ root, run, sourceState, env: { PATH: "/bin", HOME: "/safe", CLOUDFLARE_API_TOKEN: "not-for-local", NEXT_PUBLIC_SUPABASE_ANON_KEY: "not-for-build" } });
beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "bs-preview-lifecycle-")); calls = []; source = "accepted-source";
  await mkdir(appDir(), { recursive: true });
  await writeFile(path.join(appDir(), "wrangler.preview.jsonc"), await readFile(new URL("../apps/people/wrangler.preview.jsonc", import.meta.url)));
  await writeFile(path.join(appDir(), "open-next.config.ts"), await readFile(new URL("../apps/people/open-next.config.ts", import.meta.url)));
});
afterEach(async () => { await rm(root, { recursive: true, force: true }); vi.restoreAllMocks(); });

describe("isolated preview process and artifact lifecycle", () => {
  it.each([
    ["wrong SELF", (c: ReturnType<typeof previewSettings>) => { c.services[0].service = "build-something-people"; }],
    ["extra API service", (c: ReturnType<typeof previewSettings>) => { c.services.push({ binding: "API", service: "build-something-api" }); }],
    ["wrong build origin", (c: ReturnType<typeof previewSettings>) => { c.vars.NEXT_PUBLIC_PEOPLE_SITE_URL = "https://www.buildsomethingpeoplewant.com"; }],
    ["route injection", (c: ReturnType<typeof previewSettings>) => { Object.assign(c, { routes: ["example.test/*"] }); }],
    ["remote cache binding", (c: ReturnType<typeof previewSettings>) => { Object.assign(c, { r2_buckets: [] }); }],
  ] as const)("refuses %s before any deploy/build process", async (_name, change) => {
    await configChange(change);
    await expect(runPreview("deploy", "people", options())).rejects.toThrow(/configuration/);
    expect(calls).toEqual([]);
  });
  it("refuses malformed strict JSON before process execution", async () => {
    await writeFile(path.join(appDir(), "wrangler.preview.jsonc"), '{"name":');
    await expect(runPreview("build", "people", options())).rejects.toThrow(/configuration/);
    expect(calls).toEqual([]);
  });
  it.each([".env.local", ".dev.vars.preview"])("refuses injected file %s without reading it", async (file) => {
    await writeFile(path.join(appDir(), file), "DO_NOT_PRINT=private");
    await expect(runPreview("build", "people", options())).rejects.toThrow(/dotenv/);
    expect(calls).toEqual([]);
  });
  it("builds fresh, populates cache with the same config, checks before deploy and keeps local children secrets-free", async () => {
    await mkdir(path.join(appDir(), ".open-next"));
    await writeFile(path.join(appDir(), ".open-next/stale-production"), "stale");
    await runPreview("build", "people", options());
    expect(await exists(path.join(appDir(), ".open-next/stale-production"))).toBe(false);
    expect(calls.map(c => c.args)).toEqual([
      ["exec", "opennextjs-cloudflare", "build", "--config", "wrangler.preview.jsonc"],
      ["exec", "opennextjs-cloudflare", "populateCache", "local", "--config", "wrangler.preview.jsonc"],
    ]);
    expect(calls[0].options.env.NEXT_PUBLIC_PEOPLE_SITE_URL).toContain("people-preview.edutormakh.workers.dev");
    expect(calls[0].options.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("public-anon-placeholder");
    expect(calls[0].options.env).not.toHaveProperty("CLOUDFLARE_API_TOKEN");
    await expect(runPreview("deploy", "people", options())).rejects.toThrow(/check/);
    expect(calls).toHaveLength(2);
    await runPreview("check", "people", options());
    expect(calls.at(-1)!.args).toEqual(["exec", "wrangler", "deploy", "--dry-run", "--config", "wrangler.preview.jsonc"]);
    await runPreview("deploy", "people", options());
    expect(calls.at(-1)!.args).toEqual(["exec", "opennextjs-cloudflare", "deploy", "--config", "wrangler.preview.jsonc"]);
    expect(calls.at(-1)!.options.env.CLOUDFLARE_API_TOKEN).toBe("not-for-local");
    expect(calls).toHaveLength(4);
  });
  it.each(["source", "artifact", "marker", "config"])("refuses stale %s before deployment spawn", async (kind) => {
    await runPreview("build", "people", options()); await runPreview("check", "people", options()); calls = [];
    if (kind === "source") source = "changed-source";
    if (kind === "artifact") await writeFile(path.join(appDir(), ".open-next/assets/chunk.js"), "tampered");
    if (kind === "marker") await rm(marker());
    if (kind === "config") await configChange(c => { c.vars.BS_PREVIEW = "0"; });
    await expect(runPreview("deploy", "people", options())).rejects.toThrow();
    expect(calls).toEqual([]);
  });
  it("refuses symlinks escaping built artifacts without reading their content or spawning deploy", async () => {
    await runPreview("build", "people", options()); await runPreview("check", "people", options()); calls = [];
    await writeFile(path.join(root, "outside"), "private fixture");
    await symlink(path.join(root, "outside"), path.join(appDir(), ".open-next/assets/escape"));
    await expect(runPreview("deploy", "people", options())).rejects.toThrow(/escapes/);
    expect(calls).toEqual([]);
  });
  it("a failed build never leaves a valid old/new marker", async () => {
    await runPreview("build", "people", options());
    await expect(runPreview("build", "people", { ...options(), run: async () => { throw new Error("build failed"); } })).rejects.toThrow("build failed");
    expect(await exists(marker())).toBe(false);
  });
  it("refuses a compiled remote-cache override before populating or deploying it", async () => {
    const maliciousRun = async (...args: Parameters<typeof run>) => {
      await run(...args);
      if (args[1].includes("build")) await writeFile(path.join(appDir(), ".open-next/.build/open-next.config.edge.mjs"), 'const section = {override:{incrementalCache:()=>({name:"r2-cache"})}}; export default {default:section,middleware:section};');
    };
    await expect(runPreview("build", "people", { ...options(), run: maliciousRun })).rejects.toThrow(/cache/);
    expect(calls).toHaveLength(1);
    expect(await exists(marker())).toBe(false);
  });
  it("rejects unknown modes/apps rather than passing flags through", async () => {
    await expect(runPreview("deploy --name production", "people", options())).rejects.toThrow();
    await expect(runPreview("build", "../agents", options())).rejects.toThrow();
    expect(calls).toEqual([]);
  });
  it("keeps only public placeholder settings in safe local environments", () => {
    const env = safeEnvironment({ PATH: "/bin", DATABASE_URL: "private", CLOUDFLARE_API_TOKEN: "private", NODE_OPTIONS: "unsafe" });
    expect(env).not.toHaveProperty("DATABASE_URL"); expect(env).not.toHaveProperty("NODE_OPTIONS"); expect(env).not.toHaveProperty("CLOUDFLARE_API_TOKEN");
    expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("public-anon-placeholder");
  });
  it("preserves caller-owned queue identity and disposable tooling directories unchanged", () => {
    const ownContext = {
      AMB_JOB: "opaque-own-job", AMB_WORKSPACE: "opaque-own-workspace", AMB_SERVICE: "opaque-own-service",
      XDG_CONFIG_HOME: "/disposable/config", XDG_CACHE_HOME: "/disposable/cache",
    };
    expect(safeEnvironment(ownContext)).toMatchObject(ownContext);
    for (const key of Object.keys(ownContext)) expect(safeEnvironment({})).not.toHaveProperty(key);
  });
  it("rejects unrelated environment and fixes offline, telemetry and public inputs even for deploy", () => {
    const unsafe = {
      DATABASE_URL: "private", SUPABASE_SERVICE_ROLE_KEY: "private", SUPABASE_URL: "private",
      CLOUDFLARE_API_TOKEN: "explicit-token", CLOUDFLARE_ACCOUNT_ID: "explicit-account",
      CLOUDFLARE_API_KEY: "explicit-key", CLOUDFLARE_EMAIL: "explicit-email", AWS_SECRET_ACCESS_KEY: "private",
      NODE_OPTIONS: "--require=unsafe", NODE_PATH: "/unsafe", HTTP_PROXY: "http://unsafe", HTTPS_PROXY: "http://unsafe",
      ALL_PROXY: "http://unsafe", npm_config_proxy: "http://unsafe", ARBITRARY_INPUT: "unsafe",
      COREPACK_ENABLE_NETWORK: "1", npm_config_offline: "false", NO_UPDATE_NOTIFIER: "0",
      CI: "false", NEXT_TELEMETRY_DISABLED: "0", WRANGLER_SEND_METRICS: "true", BS_PREVIEW: "0",
      NEXT_PUBLIC_PEOPLE_SITE_URL: "https://unsafe.test", NEXT_PUBLIC_AGENTS_SITE_URL: "https://unsafe.test",
      NEXT_PUBLIC_SUPABASE_URL: "https://real-database.test", NEXT_PUBLIC_SUPABASE_ANON_KEY: "real-key",
    };
    const fixed = {
      ...previewSettings("people").vars, CI: "true", NEXT_TELEMETRY_DISABLED: "1", WRANGLER_SEND_METRICS: "false",
      COREPACK_ENABLE_NETWORK: "0", npm_config_offline: "true", NO_UPDATE_NOTIFIER: "1",
    };
    expect(safeEnvironment(unsafe)).toEqual(fixed);
    expect(safeEnvironment(unsafe, true)).toEqual({
      ...fixed, CLOUDFLARE_API_TOKEN: unsafe.CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID: unsafe.CLOUDFLARE_ACCOUNT_ID,
      CLOUDFLARE_API_KEY: unsafe.CLOUDFLARE_API_KEY, CLOUDFLARE_EMAIL: unsafe.CLOUDFLARE_EMAIL,
    });
  });
});


describe("preview HTTP evidence guards without network", () => {
  function recoveryResponse(app = "people", error = "unavailable") {
    const headers = {
      location: `${previewOrigins[app]}/reset-password?error=${error}`,
      "cache-control": "private, no-store", pragma: "no-cache", expires: "0",
      "referrer-policy": "no-referrer", "x-robots-tag": "noindex, nofollow",
    };
    return { status: 303, headers, rawHeaders: Object.entries(headers).flat(), bytes: Buffer.alloc(0) };
  }
  it("accepts the recorded CI Location while the old loopback predicate fails", () => {
    const recorded = "https://build-something-people-preview.edutormakh.workers.dev/reset-password?error=unavailable";
    const oldExpected = "http://localhost:36883/reset-password?error=unavailable";
    expect(recorded).not.toBe(oldExpected);
    const response = recoveryResponse(); response.headers.location = recorded;
    expect(() => validateRecoveryRedirect(response, "people")).not.toThrow();
  });
  it.each(["people", "agents"])("requires the exact configured %s Location, never loopback or a sibling/arbitrary origin", app => {
    const expected = recoveryResponse(app).headers.location;
    for (const location of [
      "http://localhost:36883/reset-password?error=unavailable",
      recoveryResponse(app === "people" ? "agents" : "people").headers.location,
      `https://www.buildsomething${app}want.com/reset-password?error=unavailable`,
      "https://attacker.invalid/reset-password?error=unavailable",
      expected.replace("https:", "http:"), expected.replace("/reset-password", ":8443/reset-password"),
      expected.replace("/reset-password", ".attacker.invalid/reset-password"),
      "/reset-password?error=unavailable", expected.replace("unavailable", "invalid"),
      expected + "&next=https://attacker.invalid", expected + "#token", expected.replace("/reset-password", "/other"),
    ]) {
      const response = recoveryResponse(app); response.headers.location = location;
      expect(() => validateRecoveryRedirect(response, app)).toThrow(/location/);
    }
  });
  it("rejects status/body/cookie/privacy regressions even with the right Location", () => {
    expect(() => validateRecoveryRedirect({ ...recoveryResponse(), status: 302 }, "people")).toThrow(/status/);
    expect(() => validateRecoveryRedirect({ ...recoveryResponse(), bytes: Buffer.from("leak") }, "people")).toThrow(/body/);
    expect(() => validateRecoveryRedirect({ ...recoveryResponse(), headers: { ...recoveryResponse().headers, "set-cookie": "dummy=1" } }, "people")).toThrow(/cookies/);
    expect(() => validateRecoveryRedirect({ ...recoveryResponse(), rawHeaders: [...recoveryResponse().rawHeaders, "Set-Cookie", "dummy=1"] }, "people")).toThrow(/cookies/);
    for (const header of ["cache-control", "pragma", "expires", "referrer-policy"]) {
      const response = recoveryResponse(); response.headers[header] = "unsafe";
      expect(() => validateRecoveryRedirect(response, "people")).toThrow();
    }
    expect(() => validateRecoveryRedirect({ ...recoveryResponse(), rawHeaders: [] }, "people")).toThrow(/robots/);
    expect(() => validateRecoveryRedirect(recoveryResponse(), "unknown")).toThrow();
    expect(() => validateRecoveryRedirect(recoveryResponse(), "people", "success")).toThrow();
  });
  it("rejects duplicate robot fields and any undeclared edge Vary delta", async () => {
    const { validatePreviewHeaders } = await import("../scripts/smoke-cloudflare-preview.mjs");
    expect(validatePreviewHeaders(["X-Robots-Tag", "noindex, nofollow", "Vary", "Accept"], "accept")).toBe("Accept");
    expect(() => validatePreviewHeaders(["X-Robots-Tag", "noindex, nofollow", "x-robots-tag", "noindex, nofollow"])).toThrow();
    expect(() => validatePreviewHeaders(["X-Robots-Tag", "noindex, nofollow", "Vary", "Accept, Accept-Encoding"], "Accept")).toThrow(/STOP/);
    expect(() => validatePreviewHeaders(["X-Robots-Tag", "noindex, nofollow", "Vary", "Accept, rsc"], undefined, true)).toThrow(/RSC/);
    expect(() => validatePreviewHeaders(["X-Robots-Tag", "noindex, nofollow", "Vary", "next-router-state-tree"], undefined, true)).toThrow(/RSC/);
  });
  it("preserves inherited native-route Vary while still rejecting any hosted token change", async () => {
    const { validatePreviewHeaders } = await import("../scripts/smoke-cloudflare-preview.mjs");
    const inherited = "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch,Accept";
    const raw = ["X-Robots-Tag", "noindex, nofollow", "Vary", inherited];
    expect(validatePreviewHeaders(raw, inherited.toLowerCase())).toBe(inherited);
    expect(() => validatePreviewHeaders([...raw.slice(0, -1), inherited + ", Accept-Encoding"], inherited)).toThrow(/STOP/);
    expect(() => validatePreviewHeaders(raw, inherited, true)).toThrow(/RSC/);
  });
  it("accounts for every request/hop in one bounded counter", async () => {
    const { createRequestBudget } = await import("../scripts/smoke-cloudflare-preview.mjs");
    const budget = createRequestBudget(3);
    expect([budget.take(), budget.take(), budget.take()]).toEqual([1, 2, 3]);
    expect(() => budget.take()).toThrow(/incomplete/);
    expect(budget.count).toBe(3);
    expect(() => createRequestBudget(1001)).toThrow();
  });
});
