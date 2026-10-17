// Local is owned loopback workerd only. Hosted performs bounded public HTTPS reads;
// it never publishes, submits a form, queries accounts, or measures hosted CPU.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import http from "node:http";
import https from "node:https";
import { createServer, createConnection } from "node:net";
import { createWriteStream } from "node:fs";
import { mkdir, mkdtemp, readFile, writeFile, appendFile, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { brotliDecompress, gunzip, inflate } from "node:zlib";
import { setTimeout as delay } from "node:timers/promises";
import { previewOrigins, repositoryRoot, safeEnvironment, validatePreviewBuild, runCommand } from "./cloudflare-preview.mjs";

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const noindex = "noindex, nofollow";
const diagnostic = "BS_PREVIEW_HANDLER_FAILED";
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const xmlValues = xml => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1].replaceAll("&amp;", "&"));
const tokenSet = text => [...new Set((text ?? "").split(",").map(t => t.trim().toLowerCase()).filter(Boolean))].sort();
const requestKey = (app, route, method, headers) => JSON.stringify([app, method, route, Object.entries(headers).sort(([a], [b]) => a.localeCompare(b))]);

export function validatePreviewHeaders(rawHeaders, baselineVary, rejectRouterVary = false) {
  // Read raw pairs, since Headers.get() alone would hide multiple header fields.
  const robots = [], vary = [];
  for (let i = 0; i < rawHeaders.length; i += 2) {
    if (rawHeaders[i].toLowerCase() === "x-robots-tag") robots.push(rawHeaders[i + 1]);
    if (rawHeaders[i].toLowerCase() === "vary") vary.push(rawHeaders[i + 1]);
  }
  assert.deepEqual(robots, [noindex], "Expected exactly one overriding robots field");
  const rawVary = vary.join(", ");
  if (rejectRouterVary) assert.ok(!tokenSet(rawVary).some(t => t === "rsc" || t.startsWith("next-router-")), "Unexpected RSC-router Vary field on negotiated R1 probe/target");
  if (baselineVary !== undefined) assert.deepEqual(tokenSet(rawVary), tokenSet(baselineVary), "Hosted Vary differs from localhost baseline; STOP and investigate, no edge delta is preapproved");
  return rawVary;
}

export function createRequestBudget(planned = 900) {
  assert.ok(Number.isInteger(planned) && planned > 0 && planned <= 900);
  let count = 0;
  return { get count() { return count; }, take() { assert.ok(count < planned && count < 1000, "Request budget exhausted; evidence incomplete"); return ++count; } };
}

async function rawRequest(url, { method, headers }) {
  return new Promise((resolve, reject) => {
    const request = (url.protocol === "https:" ? https : http).request(url, { method, headers, timeout: 20_000 }, response => {
      const chunks = []; let size = 0;
      response.on("data", chunk => {
        size += chunk.length;
        if (size > 20 * 1024 * 1024) { response.destroy(new Error("Response exceeded smoke byte budget")); return; }
        chunks.push(chunk);
      });
      response.once("error", reject);
      response.once("end", async () => {
        try {
          const encoded = Buffer.concat(chunks);
          const encoding = response.headers["content-encoding"];
          const decode = encoding === "gzip" ? gunzip : encoding === "br" ? brotliDecompress : encoding === "deflate" ? inflate : undefined;
          assert.ok(!encoding || encoding === "identity" || decode, "Unsupported content encoding");
          const bytes = method === "HEAD" || !encoded.length ? encoded : decode ? await promisify(decode)(encoded) : encoded;
          resolve({ status: response.statusCode, rawHeaders: response.rawHeaders, headers: response.headers, bytes });
        } catch (error) { reject(error); }
      });
    });
    request.once("timeout", () => request.destroy(new Error("Preview HTTP timeout")));
    request.once("error", reject); request.end();
  });
}

async function unusedPort() {
  const server = createServer();
  await new Promise((resolve, reject) => server.once("error", reject).listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}
async function tcpReady(port) {
  return new Promise(resolve => {
    const socket = createConnection({ host: "127.0.0.1", port });
    socket.setTimeout(200);
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("error", () => resolve(false)); socket.once("timeout", () => { socket.destroy(); resolve(false); });
  });
}
async function stop(child) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
  const kill = signal => { try { if (process.platform === "win32") child.kill(signal); else process.kill(-child.pid, signal); } catch (e) { if (e.code !== "ESRCH") throw e; } };
  kill("SIGTERM");
  for (let i = 0; i < 50 && child.exitCode === null && child.signalCode === null; i++) await delay(100);
  if (child.exitCode === null && child.signalCode === null) {
    kill("SIGKILL");
    await Promise.race([new Promise(resolve => child.once("exit", resolve)), delay(2000)]);
  }
}

async function publicHtmlAssets(directory) {
  const found = [];
  async function visit(dir, prefix = "") {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (!prefix && entry.name === "cdn-cgi") continue; // Reserved, not a public fixture.
      const name = `${prefix}/${entry.name}`;
      if (entry.isDirectory()) await visit(path.join(dir, entry.name), name);
      else if (entry.name.endsWith(".html")) found.push(name);
    }
  }
  await visit(directory); return found;
}

export async function smokePreview(mode, options = {}) {
  assert.ok(["local", "hosted"].includes(mode), "Expected local or hosted smoke mode");
  const root = options.root ?? repositoryRoot;
  const output = options.output ?? process.env.PREVIEW_SMOKE_LOG_DIR ?? path.join(root, ".wrangler/preview-smoke");
  await mkdir(output, { recursive: true });
  const baselinePath = path.join(output, "localhost-baseline.json");
  const recordsPath = path.join(output, `${mode}-http.jsonl`);
  const summaryPath = path.join(output, `${mode}-summary.json`);
  const builds = {};
  for (const app of ["people", "agents"]) builds[app] = await validatePreviewBuild(app, { root });
  for (const build of Object.values(builds)) assert.equal(build.marker.checked, true, "Check the preview build before smoke");
  const source = builds.people.marker.source;
  assert.equal(source, builds.agents.marker.source, "Preview builds must use the same source");
  const baseline = mode === "hosted" ? JSON.parse(await readFile(baselinePath, "utf8")) : { source, artifacts: {}, vary: {} };
  assert.equal(baseline.source, source, "Local baseline is stale; regenerate before hosted smoke");
  for (const app of ["people", "agents"]) {
    if (mode === "hosted") assert.equal(baseline.artifacts[app], builds[app].marker.artifacts, "Local baseline artifact mismatch");
    else baseline.artifacts[app] = builds[app].marker.artifacts;
  }
  const budget = createRequestBudget();
  const summary = { mode, source, requests: 0, observed5xx: 0, catchDiagnostics: mode === "local" ? 0 : null,
    hostedCpu: "unmeasured", freeTierFitness: "pending", hostedLogs: mode === "hosted" ? "separate account evidence required" : "not applicable", apps: {}, cleanup: [], failures: [] };
  const request = options.request ?? rawRequest;
  let active; let wasInterrupted = false;
  const interrupted = () => { wasInterrupted = true; void stop(active); };
  process.once("SIGINT", interrupted); process.once("SIGTERM", interrupted);
  await writeFile(recordsPath, "");
  try {
    for (const app of ["people", "agents"]) {
      const appDir = builds[app].appDir;
      const env = safeEnvironment();
      let state, log, runtimePath, port, inspector;
      let origin = previewOrigins[app];
      try {
        if (mode === "local") {
          await runCommand(pnpm, ["exec", "opennextjs-cloudflare", "populateCache", "local", "--config", "wrangler.preview.jsonc"], { cwd: appDir, env });
          await validatePreviewBuild(app, { root }); // Cache population must leave the checked artifact identical.
          state = await mkdtemp(path.join(tmpdir(), `bs-preview-${app}-`));
          port = await unusedPort(); inspector = await unusedPort(); while (inspector === port) inspector = await unusedPort();
          origin = `http://localhost:${port}`;
          runtimePath = path.join(output, `${mode}-${app}-runtime.log`);
          log = createWriteStream(runtimePath);
          active = spawn(pnpm, ["exec", "wrangler", "dev", "--local", "--config", "wrangler.preview.jsonc", "--ip", "127.0.0.1", "--port", String(port), "--inspector-port", String(inspector), "--persist-to", state, "--show-interactive-dev-session=false"],
            { cwd: appDir, env, shell: false, detached: process.platform !== "win32", stdio: ["ignore", "pipe", "pipe"] });
          let spawnError; active.once("error", error => { spawnError = error; });
          active.stdout.pipe(log, { end: false }); active.stderr.pipe(log, { end: false });
          const deadline = Date.now() + 60_000;
          while (!(await tcpReady(port))) {
            if (spawnError) throw spawnError;
            assert.ok(!wasInterrupted, "Preview smoke interrupted");
            assert.ok(active.exitCode === null && active.signalCode === null && Date.now() < deadline, "Owned runtime did not start");
            await delay(250);
          }
        }
        assert.ok(mode === "hosted" ? origin === previewOrigins[app] : /^http:\/\/localhost:\d+$/.test(origin), "Origin is outside preview allowlist");
        const startCount = budget.count;
        const keyFor = (route, method, headers) => requestKey(app, route, method, headers);
        async function check(route, expected = {}) {
          assert.ok(!wasInterrupted, "Preview smoke interrupted");
          const method = expected.method ?? "GET";
          const headers = { accept: expected.accept ?? "text/html", "accept-encoding": "identity", ...expected.headers };
          const url = new URL(route, origin); assert.equal(url.origin, origin, "No external request target allowed");
          const n = budget.take();
          const response = await request(url, { method, headers });
          const body = response.bytes.toString("utf8");
          const key = keyFor(route, method, headers);
          const record = { n, app, route, method, requestHeaders: headers, status: response.status, bytes: response.bytes.length,
            bodySha256: sha(response.bytes), headers: Object.fromEntries(Object.entries(response.headers).map(([key, value]) => [key, key === "set-cookie" ? "<redacted>" : value])),
            rawHeaders: response.rawHeaders.map((value, i) => i % 2 && response.rawHeaders[i - 1].toLowerCase() === "set-cookie" ? "<redacted>" : value) };
          await appendFile(recordsPath, JSON.stringify(record) + "\n");
          if (response.status >= 500) summary.observed5xx++;
          const vary = validatePreviewHeaders(response.rawHeaders, mode === "hosted" && Object.hasOwn(baseline.vary, key) ? baseline.vary[key] : undefined, expected.r1 === true);
          if (mode === "local") baseline.vary[key] = vary;
          else if (expected.baselineVary) assert.ok(Object.hasOwn(baseline.vary, key), "Matching localhost Vary baseline is missing");
          assert.ok(response.status < 500, `Observed ${response.status} application/platform error`);
          assert.ok((Array.isArray(expected.status) ? expected.status : [expected.status ?? 200]).includes(response.status), `${app} ${method} ${route} status ${response.status}`);
          if (expected.type) assert.ok(response.headers["content-type"]?.includes(expected.type), `${route} content-type`);
          if (expected.marker) assert.ok(body.includes(expected.marker), `${route} missing content marker`);
          if (expected.location) assert.equal(response.headers.location, expected.location, `${route} redirect location`);
          if (method === "HEAD") assert.equal(response.bytes.length, 0, "HEAD body must be empty");
          return { ...response, body };
        }
        const html = await check("/", { type: "text/html", marker: "<h1" });
        assert.ok(html.body.includes(previewOrigins[app === "people" ? "agents" : "people"]), "Twin link must use sibling preview");
        function canonicalHtml(response, route) {
          const values = [...response.body.matchAll(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"[^>]*>/g)].map(m => m[1].replaceAll("&amp;", "&"));
          assert.deepEqual(values, [`${previewOrigins[app]}${route === "/" ? "" : route}`], `${app} ${route} canonical`);
        }
        canonicalHtml(html, "/");
        assert.match(html.body, /<meta name="robots" content="index, follow"/, "Preview keeps ordinary HTML indexability metadata");
        await check("/", { accept: "text/markdown", type: "text/markdown", marker: "#", baselineVary: true });
        for (const route of ["/products/chatgpt", "/categories/design", ...(app === "people" ? ["/compare/perplexity-vs-chatgpt"] : ["/skills/chatgpt"])]) {
          const page = await check(route, { type: "text/html" }); canonicalHtml(page, route);
          const md = await check(route, { accept: "text/markdown", type: "text/markdown", marker: "#", baselineVary: true });
          if (route.startsWith("/compare/") || md.headers.link !== undefined) {
            assert.equal(md.headers.link, `<${previewOrigins[app]}${route}>; rel="canonical"`, "Markdown canonical Link");
          }
          await check(`/md${route}`, { type: "text/markdown" });
        }
        const rsc = await check("/products/chatgpt", { accept: "text/markdown", headers: { rsc: "1" }, type: "text/x-component" });
        assert.ok(!rsc.headers["x-nextjs-rewritten-path"], "RSC must not rewrite to Markdown");
        const control = await check("/products/chatgpt", { accept: "*/*", headers: { rsc: "1" }, type: "text/x-component" });
        assert.deepEqual(tokenSet(rsc.headers.vary), tokenSet(control.headers.vary), "Native RSC transport Vary must match wildcard control");
        await check("/products/chatgpt", { method: "HEAD", accept: "text/markdown", headers: { rsc: "1" }, type: "text/x-component" });
        for (const marker of ["0", "true", "1, 1"]) {
          await check("/products/chatgpt", { accept: "text/markdown", headers: { rsc: marker }, type: "text/markdown", baselineVary: true });
        }
        await check("/api/v1/products", { accept: "application/json", type: "application/json", marker: "chatgpt" });
        await check("/api/v1/products/chatgpt", { accept: "application/json", type: "application/json", marker: "chatgpt" });
        await check("/api/v1/products/d01-unknown", { accept: "application/json", status: 404, type: "application/problem+json" });
        await check("/api/v1/products", { method: "POST", accept: "application/json", status: 405 }); // Read-only API method gate; no submission.
        await check("/api/v1/products", { method: "OPTIONS", status: 204 });
        await check("/d01-unknown", { status: 404 });
        await check("/products/chatgpt", { accept: "application/json", status: 406 });
        await check("/products/google-inbox", { status: 410 });
        await check("/products/google-inbox", { accept: "text/markdown", status: 410 });
        for (const route of ["/compare/chatgpt-vs-perplexity", "/compare/stripe-vs-figma", "/compare/stripe-vs-figma?from=d01"]) {
          if (app === "agents") { await check(route, { accept: "text/markdown", status: 404, baselineVary: true, r1: true }); continue; }
          const target = route.includes("chatgpt-vs-perplexity") ? "/compare/perplexity-vs-chatgpt" : "/compare/figma-vs-stripe";
          await check(route, { accept: "text/markdown", status: 308, location: target, baselineVary: true, r1: true });
          await check(target, { accept: "text/markdown", type: "text/markdown", baselineVary: true, r1: true });
        }
        if (app === "people") {
          const uncurated = await check("/compare/figma-vs-stripe", { type: "text/html" });
          assert.match(uncurated.body, /<meta name="robots" content="noindex, follow"/);
          canonicalHtml(uncurated, "/compare/figma-vs-stripe");
          await check("/compare/chatgpt-vs-chatgpt", { status: 404 });
        }
        const slash = await check("/products/chatgpt/", { status: 308 });
        assert.equal(new URL(slash.headers.location, origin).pathname, "/products/chatgpt");
        assert.equal(new URL(slash.headers.location, origin).origin, origin);
        await check(slash.headers.location, { type: "text/html" });
        const callback = await check("/auth/recovery?code=dummy", { status: 303 });
        assert.equal(callback.headers.location, `${origin}/reset-password?error=unavailable`);
        const reset = await check("/reset-password?error=unavailable", { marker: "temporarily unavailable" });
        assert.ok(!/type="password"/.test(reset.body), "Unavailable reset must have no password form");
        for (const response of [callback, reset]) {
          assert.equal(response.headers["referrer-policy"], "no-referrer");
          assert.equal(response.headers["cache-control"], "private, no-store");
          assert.equal(response.headers.pragma, "no-cache"); assert.equal(response.headers.expires, "0");
        }
        for (const route of ["/robots.txt", "/llms.txt", "/llms-full.txt", "/feed.xml", "/atom.xml", "/openapi.json", "/.well-known/api-catalog"]) await check(route);
        const index = await check("/sitemap.xml", { type: "application/xml" });
        const urls = new Set();
        for (const child of xmlValues(index.body)) {
          const parsed = new URL(child); assert.equal(parsed.origin, previewOrigins[app], "Sitemap child origin");
          const response = await check(parsed.pathname, { type: "application/xml" });
          for (const loc of xmlValues(response.body)) { const url = new URL(loc); assert.equal(url.origin, previewOrigins[app], "Sitemap loc origin"); urls.add(url.pathname); }
        }
        if (mode === "hosted") for (const route of urls) {
          const page = await check(route, { type: "text/html" }); canonicalHtml(page, route);
        }
        const assets = [html.body.match(/(?:src|href)="([^"?]*\/_next\/static\/[^"?]+\.js)/)?.[1], html.body.match(/href="([^"?]*\/_next\/static\/[^"?]+\.css)/)?.[1]];
        assert.ok(assets.every(Boolean), "Expected JS/CSS assets in server HTML");
        for (const asset of assets) {
          const url = new URL(asset, origin); assert.equal(url.origin, origin, "Asset origin");
          const route = url.pathname;
          const get = await check(route, { accept: "*/*" });
          assert.equal(get.headers["cache-control"], "public, max-age=31536000, immutable", "Static immutable header divergence");
          assert.match(get.headers["content-type"], route.endsWith(".css") ? /text\/css/ : /(?:java|ecma)script/);
          const disk = await readFile(path.join(appDir, ".open-next/assets", route));
          assert.equal(sha(get.bytes), sha(disk), "Decoded static bytes differ from built asset");
          assert.ok(get.headers.etag, "Static ETag missing");
          await check(route, { method: "HEAD", accept: "*/*" });
          await check(route, { accept: "*/*", status: 304, headers: { "if-none-match": get.headers.etag } });
          const range = await check(route, { accept: "*/*", status: [200, 206], headers: { range: "bytes=0-31" } });
          assert.equal(sha(range.bytes), sha(range.status === 206 ? disk.subarray(0, 32) : disk), "Range support/status/bytes");
          const rangeKey = `${app}:${route}:range-status`;
          if (mode === "local") baseline.vary[rangeKey] = String(range.status);
          else assert.equal(String(range.status), baseline.vary[rangeKey], "Range support changed from local baseline");
          const compressed = await check(route, { accept: "*/*", headers: { "accept-encoding": "gzip, br" } });
          assert.equal(sha(compressed.bytes), sha(disk), "Compressed/decoded bytes");
        }
        const art = await check("/art/brand-mark-3d.png", { accept: "*/*", type: "image/png" });
        assert.equal(sha(art.bytes), sha(await readFile(path.join(appDir, ".open-next/assets/art/brand-mark-3d.png"))), "Static PNG bytes differ from build");
        // There is no favicon in either app's committed public/app tree.
        await check("/favicon.ico", { accept: "*/*", status: 404 });
        await check("/BUILD_ID", { accept: "*/*" });
        await check("/BUILD_ID", { accept: "application/json", status: 406 });
        const htmlAssets = await publicHtmlAssets(path.join(appDir, ".open-next/assets"));
        for (const route of htmlAssets.slice(0, 2)) {
          const alias = route.endsWith("/index.html") ? route.slice(0, -10) : route.slice(0, -5);
          // Asset redirects, if generated, must be checked separately with no auto-follow.
          const response = await check(alias, { accept: "*/*", status: [200, 301, 302, 307, 308] });
          if (response.status >= 300) {
            const target = new URL(response.headers.location, origin);
            assert.equal(target.origin, origin, "Asset redirect must remain on the preview");
            await check(target.pathname + target.search, { accept: "*/*" });
          } else assert.ok(response.bytes.length, "HTML asset response empty");
        }
        summary.apps[app] = { requests: budget.count - startCount, eligibleUrls: urls.size, publicHtmlAssets: htmlAssets.length,
          assetFirstDifference: "/BUILD_ID negotiates Accept in preview", robotsHeaderOverride: noindex };
      } finally {
        await stop(active); active = undefined;
        if (log) await new Promise(resolve => log.end(resolve));
        let catches = 0;
        try {
          if (runtimePath) {
            const runtime = await readFile(runtimePath, "utf8");
            catches = runtime.split(diagnostic).length - 1; summary.catchDiagnostics += catches;
          }
        } finally {
          if (state) await rm(state, { recursive: true, force: true });
          const httpClosed = !port || !(await tcpReady(port));
          const inspectorClosed = !inspector || !(await tcpReady(inspector));
          summary.cleanup.push({ app, httpPort: port, inspectorPort: inspector, httpClosed, inspectorClosed, stateRemoved: Boolean(state) });
          assert.ok(httpClosed, "Owned HTTP port still open");
          assert.ok(inspectorClosed, "Owned inspector port still open");
        }
        assert.equal(catches, 0, "Preview catch diagnostics observed in owned runtime");
      }
    }
    if (mode === "local") await writeFile(baselinePath, JSON.stringify(baseline, null, 2) + "\n");
  } catch (error) {
    summary.failures.push(error.message); throw error;
  } finally {
    await stop(active); process.off("SIGINT", interrupted); process.off("SIGTERM", interrupted);
    summary.requests = budget.count;
    await writeFile(summaryPath, JSON.stringify(summary, null, 2) + "\n");
    console.log(JSON.stringify({ summaryPath, ...summary }));
  }
  return summary;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3) { console.error("Usage: smoke-cloudflare-preview.mjs local|hosted"); process.exitCode = 1; }
  else smokePreview(process.argv[2]).catch(error => { console.error(error.message); process.exitCode = 1; });
}
