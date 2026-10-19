// Real next start over HTTP with the HTTPS/public Host headers used by a tunnel.
// Run sequentially under AMB; --build prepares isolated, dummy-configured outputs.
// amb run build -- node scripts/ubuntu-proxy-rewrite.test.mjs --build
// amb run test -- node scripts/ubuntu-proxy-rewrite.test.mjs [--output /path/evidence.json]
// --expect-broken is only for capturing the pre-fix 500/EPROTO reproduction.
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir, writeFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { safeEnvironment } from "./cloudflare-preview.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const args = process.argv.slice(2);
assert.ok(args.every((arg, i) => ["--build", "--expect-broken", "--output"].includes(arg) || args[i - 1] === "--output"));
assert.ok(process.env.AMB_JOB && process.env.AMB_WORKSPACE, "Run via amb run build/test");
const context = JSON.parse(execFileSync("amb", ["context"], { cwd: root, encoding: "utf8" }));
assert.equal(context.path, root.replace(/\/$/, ""));
assert.equal(context.id, process.env.AMB_WORKSPACE);
const env = { ...safeEnvironment(), NODE_ENV: "production",
  NEXT_PUBLIC_PEOPLE_SITE_URL: "https://www.buildsomethingpeoplewant.com",
  NEXT_PUBLIC_AGENTS_SITE_URL: "https://www.buildsomethingagentswant.com" };
// Inspect names only: Next must never load a linked private dotenv file.
for (const directory of [root, path.join(root, "apps/people"), path.join(root, "apps/agents")]) {
  assert.ok(!(await readdir(directory)).some(name => name !== ".env.example" && /^\.(?:env|dev\.vars)(?:\.|$)/.test(name)), "Refusing dotenv injection");
}
const report = { utc: new Date().toISOString(), workspace: context.id, job: process.env.AMB_JOB,
  expectedBroken: args.includes("--expect-broken"), requestCap: 20, requests: 0, checks: [], logs: {} };
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function ready(port, child) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    assert.equal(child.exitCode, null, "Next exited before readiness");
    const connected = await new Promise(resolve => {
      const socket = net.connect({ host: "127.0.0.1", port });
      socket.setTimeout(200);
      socket.once("connect", () => { socket.destroy(); resolve(true); });
      socket.once("error", () => { socket.destroy(); resolve(false); });
      socket.once("timeout", () => { socket.destroy(); resolve(false); });
    });
    if (connected) return;
    await delay(100);
  }
  throw new Error("Next readiness timed out (TCP only; no HTTP probes)");
}
async function stop(child) {
  if (child.exitCode !== null) return;
  const exited = new Promise(resolve => child.once("exit", resolve));
  child.kill("SIGTERM");
  const timer = setTimeout(() => child.kill("SIGKILL"), 3000);
  await exited;
  clearTimeout(timer);
}
async function fixture(app, port, kind, pathname, headers, method = "GET") {
  assert.ok(++report.requests <= report.requestCap);
  const requestHeaders = { host: new URL(env[`NEXT_PUBLIC_${app.toUpperCase()}_SITE_URL`]).host,
    "x-forwarded-proto": "https", ...headers };
  const response = await fetch(`http://127.0.0.1:${port}${pathname}`, {
    method, headers: requestHeaders, redirect: "manual", signal: AbortSignal.timeout(10000),
  });
  const body = await response.text();
  const entry = { app, port, kind, pathname, method, requestHeaders, status: response.status,
    headers: Object.fromEntries(response.headers), bytes: Buffer.byteLength(body),
    sha256: createHash("sha256").update(body).digest("hex"),
    canonical: body.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1] ??
      response.headers.get("link")?.match(/<([^>]+)>;\s*rel="?canonical\b/)?.[1] ?? null,
    bodySample: body.slice(0, 400) };
  report.checks.push(entry);
  return { ...entry, body };
}
try {
  for (const app of ["people", "agents"]) {
    const cwd = path.join(root, "apps", app);
    const next = path.join(cwd, "node_modules/next/dist/bin/next");
    if (args.includes("--build")) {
      await new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [next, "build"], { cwd, env, stdio: "inherit" });
        child.once("error", reject);
        child.once("exit", code => code === 0 ? resolve() : reject(new Error(`${app} build exit ${code}`)));
      });
      continue;
    }
    const port = context.ports[app];
    // Fail closed instead of probing any process already occupying this port.
    await new Promise((resolve, reject) => {
      const probe = net.createServer();
      probe.once("error", reject);
      probe.listen({ host: "127.0.0.1", port, exclusive: true }, () => probe.close(resolve));
    });
    const child = spawn(process.execPath, [next, "start", "--hostname", "127.0.0.1", "--port", String(port)], { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
    let logs = "";
    child.stdout.on("data", data => { logs = (logs + data).slice(-16000); });
    child.stderr.on("data", data => { logs = (logs + data).slice(-16000); });
    try {
      await ready(port, child);
      const check = (kind, pathname, headers, method) => fixture(app, port, kind, pathname, headers, method);
      const canonical = `${env[`NEXT_PUBLIC_${app.toUpperCase()}_SITE_URL`]}/products/chatgpt`;
      const html = await check("html", "/products/chatgpt", { accept: "text/html" });
      assert.equal(html.status, 200); assert.match(html.headers["content-type"], /^text\/html/);
      assert.equal(html.canonical, canonical); assert.match(html.body, /ChatGPT/);
      assert.equal(html.headers["cache-control"], "s-maxage=31536000");
      assert.ok(!html.headers["set-cookie"]);
      // Next's browser Flight transport uses */*. Its middleware adapter strips
      // RSC markers before negotiation; raw text/x-component is a separate contract.
      const rsc = await check("rsc", "/products/chatgpt", { accept: "*/*", rsc: "1" });
      assert.equal(rsc.status, 200); assert.match(rsc.headers["content-type"], /^text\/x-component/);
      assert.match(rsc.body, /ChatGPT/); assert.match(rsc.headers.vary, /rsc/i);
      assert.equal(rsc.headers.vary, html.headers.vary);
      assert.equal(rsc.headers["cache-control"], html.headers["cache-control"]);
      const md = await check("markdown", "/products/chatgpt", { accept: "text/markdown" });
      if (report.expectedBroken) {
        assert.equal(md.status, 500); assert.equal(md.body, "Internal Server Error");
      } else {
        assert.equal(md.status, 200); assert.match(md.headers["content-type"], /^text\/markdown/);
        // Product Markdown has no canonical Link header (comparison Markdown does).
        assert.equal(md.canonical, null);
        const twin = env[`NEXT_PUBLIC_${app === "people" ? "AGENTS" : "PEOPLE"}_SITE_URL`];
        assert.ok(md.body.includes(`Twin page: ${twin}/products/chatgpt`));
        assert.doesNotMatch(md.body, /https?:\/\/(?:localhost|127\.0\.0\.1)/);
        assert.match(md.headers.vary, /Accept/i); assert.match(md.body, /ChatGPT/);
        assert.equal(md.headers["x-middleware-rewrite"], "/md/products/chatgpt");
        assert.ok(!md.headers.location); assert.ok(!md.headers["set-cookie"]);
        const query = await check("markdown-query", "/products/chatgpt?view=full&label=a%2Fb", { accept: "text/markdown" });
        assert.equal(query.status, 200); assert.equal(query.body, md.body); assert.equal(query.canonical, md.canonical);
        assert.equal(query.headers["x-middleware-rewrite"], "/md/products/chatgpt?view=full&label=a%2Fb");
        const home = await check("markdown-home", "/", { accept: "text/markdown" });
        assert.equal(home.status, 200); assert.match(home.headers["content-type"], /^text\/markdown/);
        const unacceptable = await check("not-acceptable", "/products/chatgpt", { accept: "application/xml" });
        assert.equal(unacceptable.status, 406); assert.match(unacceptable.headers.vary, /Accept/i);
        const retired = await check("retired", "/products/google-inbox", { accept: "text/markdown" });
        assert.equal(retired.status, 410); assert.match(retired.body, /Gone/); assert.match(retired.headers.vary, /Accept/i);
        const auth = await check("auth", "/reset-password", { accept: "text/markdown" });
        assert.equal(auth.status, 200); assert.match(auth.headers["cache-control"], /private.*no-store/);
        assert.equal(auth.headers["referrer-policy"], "no-referrer"); assert.equal(auth.headers["x-robots-tag"], "noindex, nofollow");
        const recovery = await check("recovery", "/auth/recovery?next=https%3A%2F%2Fevil.invalid%2F&redirect=%2F%2Fevil.invalid", { accept: "text/html" });
        assert.equal(recovery.status, 303);
        assert.equal(recovery.headers.location, `${env[`NEXT_PUBLIC_${app.toUpperCase()}_SITE_URL`]}/reset-password?error=unavailable`);
        assert.equal(recovery.headers["cache-control"], "private, no-store");
        assert.equal(recovery.headers.pragma, "no-cache"); assert.equal(recovery.headers.expires, "0");
        assert.equal(recovery.headers["referrer-policy"], "no-referrer"); assert.equal(recovery.headers["x-robots-tag"], "noindex, nofollow");
        assert.ok(!recovery.headers["set-cookie"]); assert.equal(recovery.body, "");
      }
    } finally {
      await stop(child);
      report.logs[app] = logs;
    }
    if (report.expectedBroken) assert.match(logs, /Failed to proxy https:\/\/localhost:.*EPROTO/s);
    else assert.doesNotMatch(logs, /Failed to proxy|EPROTO/);
  }
  report.result = "PASS";
} catch (error) {
  report.result = "FAIL"; report.failure = String(error.stack ?? error); process.exitCode = 1;
} finally {
  const output = args.indexOf("--output");
  if (output >= 0) await writeFile(args[output + 1], JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report));
}
