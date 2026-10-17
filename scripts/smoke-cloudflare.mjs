// Builds must already exist: pnpm build:cloudflare && pnpm smoke:cloudflare.
// Uses disposable local state and OS-assigned loopback ports; never deploys.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { access, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const root = fileURLToPath(new URL("../", import.meta.url));
// Inherit no account tokens or real database configuration.
const env = Object.fromEntries(
  ["PATH", "HOME", "LANG", "LC_ALL", "TMPDIR", "SystemRoot"].flatMap((key) =>
    process.env[key] === undefined ? [] : [[key, process.env[key]]]),
);
Object.assign(env, {
  CI: "true", NEXT_TELEMETRY_DISABLED: "1", WRANGLER_SEND_METRICS: "false",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:9",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-placeholder",
});
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
let requests = 0;
let active;

function validateWebpAsset(bytes, disk, budget, route) {
  assert.equal(bytes.toString("ascii", 0, 4), "RIFF", `${route}: RIFF signature`);
  assert.equal(bytes.toString("ascii", 8, 12), "WEBP", `${route}: WebP signature`);
  assert.ok(bytes.length <= budget, `${route}: WebP payload exceeds byte budget`);
  assert.equal(sha(bytes), sha(disk), `${route}: WebP bytes differ from built asset`);
}

async function stop(child) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
  const kill = (signal) => {
    try {
      if (process.platform === "win32") child.kill(signal);
      else process.kill(-child.pid, signal);
    } catch (error) { if (error.code !== "ESRCH") throw error; }
  };
  kill("SIGTERM");
  for (let i = 0; i < 50 && child.exitCode === null && child.signalCode === null; i++) await delay(100);
  if (child.exitCode === null && child.signalCode === null) kill("SIGKILL");
}
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, async () => { await stop(active); process.exit(signal === "SIGINT" ? 130 : 143); });
}

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => server.once("error", reject).listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

function launch(args, log) {
  console.log(`> pnpm ${args.join(" ")}`);
  const child = spawn(pnpm, args, { cwd: root, env, detached: process.platform !== "win32", stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.pipe(log, { end: false });
  child.stderr.pipe(log, { end: false });
  return child;
}

async function run(app) {
  await access(path.join(root, "apps", app, ".open-next/worker.js"));
  const state = await mkdtemp(path.join(tmpdir(), `bs-smoke-${app}-`));
  const logDir = process.env.SMOKE_LOG_DIR ? path.resolve(process.env.SMOKE_LOG_DIR) : state;
  await mkdir(logDir, { recursive: true });
  const logPath = path.join(logDir, `C01-runtime-${app}.log`);
  const log = createWriteStream(logPath);
  let child;
  let passed = 0;
  let failed = true;
  try {
    // Raw wrangler dev does not populate the read-only SSG cache. The OpenNext
    // preview/deploy lifecycle does; repeat that required local step explicitly.
    child = active = launch(["--filter", `@bs/${app}`, "exec", "opennextjs-cloudflare", "populateCache", "local"], log);
    const code = await new Promise((resolve, reject) => { child.once("error", reject); child.once("exit", resolve); });
    assert.equal(code, 0, `cache population failed; see ${logPath}`);
    const port = await freePort();
    let inspectorPort = await freePort();
    while (inspectorPort === port) inspectorPort = await freePort();
    const origin = `http://127.0.0.1:${port}`;
    child = active = launch(["--filter", `@bs/${app}`, "exec", "wrangler", "dev", "--local", "--ip", "127.0.0.1", "--port", String(port), "--inspector-port", String(inspectorPort), "--persist-to", state, "--show-interactive-dev-session=false"], log);
    let spawnError;
    child.once("error", (error) => { spawnError = error; });
    let ready = false;
    const readyDeadline = Date.now() + 60_000;
    while (Date.now() < readyDeadline) {
      if (spawnError) throw spawnError;
      if (child.exitCode !== null || child.signalCode !== null) throw new Error(`Worker exited ${child.exitCode}; see ${logPath}`);
      try {
        requests++;
        const response = await fetch(`${origin}/api/v1/products/chatgpt`, { signal: AbortSignal.timeout(1000) });
        await response.body?.cancel();
        if (response.status === 200) { ready = true; break; }
      } catch { /* wait for this task's runtime only */ }
      await delay(500);
    }
    assert.ok(ready, `Worker not ready within 60 seconds; see ${logPath}`);
    async function check(route, { accept = "text/html", status = 200, type = "text/html", marker, json, headers = {}, webpBudget } = {}) {
      const started = performance.now();
      const n = ++requests;
      const response = await fetch(`${origin}${route}`, { headers: { accept }, redirect: "manual", signal: AbortSignal.timeout(15000) });
      const bytes = Buffer.from(await response.arrayBuffer());
      const body = bytes.toString("utf8");
      assert.ok(bytes.length > 0, `${route}: empty body`);
      assert.equal(response.status, status, `${app} ${route} ${accept}: status`);
      assert.ok(response.headers.get("content-type")?.includes(type), `${route}: content-type ${response.headers.get("content-type")}`);
      if (marker) assert.ok(body.includes(marker), `${route}: missing ${marker}`);
      for (const [name, expected] of Object.entries(headers)) assert.match(response.headers.get(name) ?? "", expected, `${route}: ${name}`);
      if (json) json(JSON.parse(body));
      if (webpBudget !== undefined) validateWebpAsset(bytes, await readFile(path.join(root, "apps", app, ".open-next/assets", route)), webpBudget, route);
      passed++;
      console.log(JSON.stringify({ n, app, route, accept, status: response.status, type: response.headers.get("content-type"), bytes: bytes.length, elapsedMs: +(performance.now() - started).toFixed(1), cache: response.headers.get("x-nextjs-cache"), openNextCache: response.headers.get("x-opennext-cache"), headers: Object.fromEntries(Object.keys(headers).map((name) => [name, response.headers.get(name)])) }));
      return body;
    }
    const html = await check("/", { marker: "<h1", headers: { "x-content-type-options": /^nosniff$/, vary: /accept/i } });
    await check("/", { accept: "text/markdown", type: "text/markdown", marker: "#", headers: { vary: /accept/i } });
    for (let i = 0; i < 2; i++) await check("/products/chatgpt", { marker: "ChatGPT", headers: { "x-opennext-cache": /^HIT$/ } });
    await check("/products/chatgpt", { accept: "text/markdown", type: "text/markdown", marker: "ChatGPT", headers: { vary: /accept/i } });
    await check("/products/c01-unknown", { status: 404 });
    await check("/products/c01-unknown", { accept: "text/markdown", status: 404, type: "text/markdown", marker: "Not found" });
    await check("/api/v1/products/chatgpt", { accept: "application/json", type: "application/json", json: (data) => assert.ok(JSON.stringify(data).includes('"slug":"chatgpt"')) });
    await check("/api/v1/products/c01-unknown", { status: 404, accept: "application/json", type: "application/problem+json", json: (data) => assert.equal(data.status, 404) });
    await check("/sitemap.xml", { type: "application/xml", marker: "<sitemapindex" });
    await check("/sitemaps/products.xml", { type: "application/xml", marker: "/products/chatgpt" });
    await check("/robots.txt", { type: "text/plain", marker: "Sitemap:" });
    await check("/llms.txt", { type: "text/plain", marker: "#" });
    await check("/c01-unknown", { status: 404 });
    const asset = html.match(/(?:src|href)="([^"?]*\/_next\/static\/[^"?]+\.js)/)?.[1];
    assert.ok(asset, "HTML must include a Next static JS resource");
    const assetURL = new URL(asset, origin);
    assert.equal(assetURL.origin, origin, "asset must stay on loopback");
    await check(assetURL.pathname, { type: "javascript", headers: { "cache-control": /immutable/ } });
    const css = html.match(/href="([^"?]*\/_next\/static\/[^"?]+\.css)/)?.[1];
    assert.ok(css, "HTML must include a Next static CSS resource");
    const cssURL = new URL(css, origin);
    assert.equal(cssURL.origin, origin, "stylesheet must stay on loopback");
    await check(cssURL.pathname, { type: "text/css", headers: { "cache-control": /immutable/ } });
    await check("/art/brand-mark-3d.png", { type: "image/png" });
    for (const [route, webpBudget] of [
      ["/art/brand-mark-display-v1.webp", 60 * 1024],
      ["/art/brand-mark-environment-v1.webp", 180 * 1024],
      [`/art/${app}-hero-display-v1.webp`, (app === "people" ? 320 : 350) * 1024],
    ]) await check(route, { accept: "*/*", type: "image/webp", webpBudget });
    if (app === "agents") {
      await check("/skills/chatgpt", { marker: "ChatGPT" });
      await check("/skills/chatgpt/raw", { accept: "text/html", type: "text/markdown", marker: "ChatGPT" });
      await check("/skills/c01-unknown/raw", { status: 404, type: "text/plain" });
    } else {
      await check("/compare/chatgpt-vs-c01-unknown", { status: 404 });
      await check("/compare/chatgpt-vs-c01-unknown", { accept: "text/markdown", status: 404, type: "text/markdown", marker: "Not found" });
    }
    failed = false;
    console.log(`${app}: ${passed} HTTP checks passed. Local elapsed times are not Worker CPU. Runtime log: ${logPath}`);
  } finally {
    await stop(child);
    active = undefined;
    await new Promise((resolve) => log.end(resolve));
    if (failed && !process.env.SMOKE_LOG_DIR) console.error(await readFile(logPath, "utf8"));
    // Show diagnostics before removing default disposable logs on failure/success.
    if (!process.env.SMOKE_LOG_DIR) console.log(`Runtime/state removed: ${state}; set SMOKE_LOG_DIR to retain logs.`);
    await rm(state, { recursive: true, force: true });
  }
}

try { for (const app of ["people", "agents"]) await run(app); }
catch (error) { console.error(error); process.exitCode = 1; }
finally { console.log(JSON.stringify({ requests, scope: "both apps, including readiness requests" })); }
