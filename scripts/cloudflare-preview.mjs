// Local modes never publish. Deploy is an explicit, separately authorized operation.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { readdir, readFile, writeFile, rm, lstat, readlink, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
export const previewOrigins = Object.freeze({
  people: "https://build-something-people-preview.edutormakh.workers.dev",
  agents: "https://build-something-agents-preview.edutormakh.workers.dev",
});
const configName = "wrangler.preview.jsonc";
const markerName = "preview-build.json";
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const hash = value => createHash("sha256").update(value).digest("hex");
const canonical = value => Array.isArray(value) ? `[${value.map(canonical).join(",")}]`
  : value && typeof value === "object" ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}` : JSON.stringify(value);

export function previewSettings(app) {
  assert.ok(Object.hasOwn(previewOrigins, app), "Expected people or agents");
  return {
    $schema: "./node_modules/wrangler/config-schema.json", name: `build-something-${app}-preview`, main: "worker.mjs",
    compatibility_date: "2026-10-16", compatibility_flags: ["nodejs_compat"], workers_dev: true,
    assets: { directory: ".open-next/assets", binding: "ASSETS", run_worker_first: true },
    services: [{ binding: "WORKER_SELF_REFERENCE", service: `build-something-${app}-preview` }],
    vars: { BS_PREVIEW: "1", NEXT_PUBLIC_PEOPLE_SITE_URL: previewOrigins.people, NEXT_PUBLIC_AGENTS_SITE_URL: previewOrigins.agents,
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:9", NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-placeholder" },
    observability: { enabled: true }, preview_urls: false,
  };
}

export function safeEnvironment(input = process.env, operational = false) {
  const allowed = ["PATH", "HOME", "LANG", "LC_ALL", "TMPDIR", "SystemRoot"];
  if (operational) allowed.push("CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_KEY", "CLOUDFLARE_EMAIL");
  const env = Object.fromEntries(allowed.flatMap(key => input[key] === undefined ? [] : [[key, input[key]]]));
  return { ...env, ...previewSettings("people").vars, CI: "true", NEXT_TELEMETRY_DISABLED: "1", WRANGLER_SEND_METRICS: "false" };
}

export async function readPreviewConfig(root, app) {
  const expected = previewSettings(app);
  const appDir = path.join(root, "apps", app);
  for (const directory of [root, appDir]) {
    const names = await readdir(directory);
    assert.ok(!names.some(name => name !== ".env.example" && (/^\.env(?:\.|$)/.test(name) || /^\.dev\.vars(?:\.|$)/.test(name))), "Refusing local dotenv/dev-vars injection (contents are not read)");
  }
  let config;
  try {
    config = JSON.parse(await readFile(path.join(appDir, configName), "utf8"));
    assert.equal(canonical(config), canonical(expected));
  } catch { throw new Error("Invalid isolated preview configuration"); }
  const openNext = await readFile(path.join(appDir, "open-next.config.ts"), "utf8");
  assert.match(openNext, /import staticAssetsIncrementalCache from ["']@opennextjs\/cloudflare\/overrides\/incremental-cache\/static-assets-incremental-cache["']/);
  assert.match(openNext, /incrementalCache:\s*staticAssetsIncrementalCache\s*[,}]/, "Unexpected source cache override");
  return { appDir, config, configHash: hash(canonical(config)), openNextHash: hash(openNext) };
}

export function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: options.cwd, env: options.env, shell: false,
      detached: process.platform !== "win32", stdio: ["ignore", options.capture ? "pipe" : "inherit", "inherit"] });
    let stdout = "";
    if (options.capture) child.stdout.on("data", data => { stdout += data; });
    const kill = signal => {
      if (!child.pid || child.exitCode !== null || child.signalCode !== null) return;
      try { if (process.platform === "win32") child.kill(signal); else process.kill(-child.pid, signal); }
      catch (error) { if (error.code !== "ESRCH") throw error; }
    };
    let timer;
    const interrupt = () => { kill("SIGTERM"); timer = setTimeout(() => kill("SIGKILL"), 2500); timer.unref(); };
    process.once("SIGINT", interrupt); process.once("SIGTERM", interrupt);
    const cleanup = () => { clearTimeout(timer); process.off("SIGINT", interrupt); process.off("SIGTERM", interrupt); };
    child.once("error", error => { cleanup(); reject(error); });
    child.once("exit", (code, signal) => {
      cleanup();
      if (code !== 0) reject(new Error(`${command} failed (${signal ?? code})`)); else resolve(stdout);
    });
  });
}

async function sourceState(root, env) {
  const git = args => runCommand("git", args, { cwd: root, env, capture: true });
  assert.equal((await git(["diff", "--name-only", "HEAD"])).trim(), "", "Tracked source is not committed");
  const untracked = (await git(["ls-files", "--others", "--exclude-standard", "-z"])).split("\0").filter(Boolean);
  assert.ok(untracked.every(name => name === "t3.json"), "Uncommitted source files prevent a reproducible preview build");
  return (await git(["rev-parse", "HEAD"])).trim();
}

async function artifactHash(directory) {
  const digest = createHash("sha256"); let count = 0;
  const outputRoot = await realpath(directory);
  async function visit(dir, relative = "") {
    for (const name of (await readdir(dir)).sort()) {
      if (!relative && name === markerName) continue;
      const filename = path.join(dir, name); const key = path.posix.join(relative, name);
      const stat = await lstat(filename);
      if (stat.isSymbolicLink()) {
        // OpenNext retains pnpm links between traced packages. Hash their text;
        // all destination bytes are already traversed inside this output tree.
        const target = await realpath(filename);
        assert.ok(target.startsWith(outputRoot + path.sep) && target !== path.join(outputRoot, markerName), "Preview artifact symlink escapes its output");
        digest.update(key + "\0link\0"); digest.update(await readlink(filename)); count++;
      } else if (stat.isDirectory()) await visit(filename, key);
      else { assert.ok(stat.isFile(), "Unexpected preview artifact"); digest.update(key + "\0"); digest.update(hash(await readFile(filename))); count++; }
    }
  }
  await visit(directory); assert.ok(count > 0, "Missing preview artifacts");
  return digest.digest("hex");
}

async function verifyCompiledCache(appDir) {
  const filename = path.join(appDir, ".open-next/.build/open-next.config.edge.mjs");
  const digest = hash(await readFile(filename));
  const config = (await import(`${pathToFileURL(filename).href}?digest=${digest}`)).default;
  const init = await readFile(path.join(appDir, ".open-next/cloudflare/init.js"), "utf8");
  assert.match(init, /__ASSETS_RUN_WORKER_FIRST__:\s*true/, "Preview was not compiled with worker-first assets");
  assert.ok(config.default && config.middleware, "Missing compiled cache configuration");
  for (const section of [config.default, config.middleware]) {
    const resolve = section.override?.incrementalCache;
    assert.equal(typeof resolve, "function", "Unexpected compiled cache override");
    assert.equal((await resolve()).name, "cf-static-assets-incremental-cache", "Unexpected compiled cache override");
  }
}

export async function validatePreviewBuild(app, options = {}) {
  const root = options.root ?? repositoryRoot;
  const info = await readPreviewConfig(root, app);
  const env = safeEnvironment(options.env ?? process.env);
  const currentSource = await (options.sourceState ?? (() => sourceState(root, env)))();
  const output = path.join(info.appDir, ".open-next");
  let marker;
  try { marker = JSON.parse(await readFile(path.join(output, markerName), "utf8")); }
  catch { throw new Error("Missing or invalid preview build marker; build and check first"); }
  assert.equal(marker.version, 1, "Invalid preview marker version");
  assert.equal(marker.app, app, "Wrong preview marker app");
  assert.equal(marker.source, currentSource, "Stale source; rebuild preview");
  assert.equal(marker.configHash, info.configHash, "Stale preview configuration");
  assert.equal(marker.openNextHash, info.openNextHash, "Stale cache configuration");
  assert.equal(marker.artifacts, await artifactHash(output), "Stale preview artifacts");
  assert.equal(canonical(marker.origins), canonical(previewOrigins), "Wrong preview build origins");
  await verifyCompiledCache(info.appDir);
  return { ...info, marker, output };
}

export async function runPreview(mode, app, options = {}) {
  assert.ok(["build", "check", "deploy"].includes(mode), "Expected build, check or deploy mode");
  previewSettings(app);
  const root = options.root ?? repositoryRoot;
  const info = await readPreviewConfig(root, app); // Refuse before any process, including git.
  const env = safeEnvironment(options.env ?? process.env, mode === "deploy");
  const run = options.run ?? runCommand;
  const source = options.sourceState ?? (() => sourceState(root, safeEnvironment(options.env ?? process.env)));
  const execute = args => run(pnpm, ["exec", ...args, "--config", configName], { cwd: info.appDir, env });
  const output = path.join(info.appDir, ".open-next");
  const markerPath = path.join(output, markerName);
  if (mode === "build") {
    const beforeSource = await source();
    await rm(path.join(info.appDir, ".next"), { recursive: true, force: true });
    await rm(output, { recursive: true, force: true });
    await execute(["opennextjs-cloudflare", "build"]);
    await verifyCompiledCache(info.appDir);
    await execute(["opennextjs-cloudflare", "populateCache", "local"]);
    const after = await readPreviewConfig(root, app);
    assert.equal(after.configHash, info.configHash, "Configuration changed during preview build");
    assert.equal(after.openNextHash, info.openNextHash, "Cache configuration changed during preview build");
    assert.equal(await source(), beforeSource, "Source changed during preview build");
    const marker = { version: 1, app, source: beforeSource, configHash: info.configHash, openNextHash: info.openNextHash,
      origins: previewOrigins, artifacts: await artifactHash(output), checked: false };
    await writeFile(markerPath, JSON.stringify(marker, null, 2) + "\n");
    return marker;
  }
  const { marker } = await validatePreviewBuild(app, { ...options, sourceState: source });
  if (mode === "check") {
    marker.checked = false; await writeFile(markerPath, JSON.stringify(marker, null, 2) + "\n");
    await execute(["wrangler", "deploy", "--dry-run"]);
    await validatePreviewBuild(app, { ...options, sourceState: source });
    marker.checked = true; await writeFile(markerPath, JSON.stringify(marker, null, 2) + "\n");
  } else {
    assert.equal(marker.checked, true, "A successful check is required before preview deployment");
    await execute(["opennextjs-cloudflare", "deploy"]);
  }
  return marker;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 4) { console.error("Usage: cloudflare-preview.mjs build|check|deploy people|agents"); process.exitCode = 1; }
  else runPreview(process.argv[2], process.argv[3]).catch(error => { console.error(error.message); process.exitCode = 1; });
}
