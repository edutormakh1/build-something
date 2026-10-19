import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { previewFetch, PREVIEW_ERROR_DIAGNOSTIC } from "../packages/seo/src/preview";

const req = () => new Request("https://example.test/products/chatgpt");
afterEach(() => vi.restoreAllMocks());

describe("preview response boundary", () => {
  it.each([undefined, "0", "true", 1])("preserves production identity, promise and errors with marker %s", async (flag) => {
    const response = new Response("production", { headers: { "x-robots-tag": "noindex, follow" } });
    const promised = Promise.resolve(response);
    expect(previewFetch(() => response, flag)).toBe(response);
    expect(previewFetch(() => promised, flag)).toBe(promised);
    const error = new Error("private diagnostic");
    expect(() => previewFetch(() => { throw error; }, flag)).toThrow(error);
    await expect(previewFetch(() => Promise.reject(error), flag)).rejects.toBe(error);
    expect(response.headers.get("x-robots-tag")).toBe("noindex, follow");
  });

  it.each([200, 204, 206, 301, 303, 304, 307, 308, 400, 404, 405, 406, 410, 500])("tags status %s and keeps body/init/other headers", async (status) => {
    const body = [204, 304].includes(status) ? null : `status ${status}`;
    const input = new Response(body, { status, statusText: "Original", headers: {
      "X-Robots-Tag": "noindex, follow", vary: "Accept", "cache-control": "private, no-store",
      location: "/target", "referrer-policy": "no-referrer", "content-type": "text/plain",
    } });
    const originalHeaders = [...input.headers];
    const output = await previewFetch(() => input, "1");
    expect(output).not.toBe(input);
    expect(output.status).toBe(status);
    expect(output.statusText).toBe("Original");
    expect(output.body).toBe(input.body);
    expect(output.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect([...input.headers]).toEqual(originalHeaders);
    for (const [key, value] of originalHeaders) if (key !== "x-robots-tag") expect(output.headers.get(key)).toBe(value);
    expect(await output.text()).toBe(body ?? "");
  });

  it("copies immutable redirects instead of mutating their headers", async () => {
    const input = Response.redirect("https://example.test/reset-password", 303);
    expect(() => input.headers.set("x-robots-tag", "x")).toThrow();
    const output = await previewFetch(() => input, "1");
    expect(output.status).toBe(303);
    expect(output.headers.get("location")).toBe("https://example.test/reset-password");
    expect(output.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(output.body).toBeNull();
  });

  it("preserves independent session chunks and the Expires comma without parsing cookies", async () => {
    const cookies = [
      "sb-test-auth-token.0=first; Path=/; Expires=Wed, 21 Oct 2026 07:28:00 GMT; HttpOnly; Secure; SameSite=Lax",
      "sb-test-auth-token.1=second; Path=/; HttpOnly; Secure; SameSite=Lax",
    ];
    const headers = new Headers({ "X-ROBOTS-TAG": "index, follow", "cache-control": "private, no-store" });
    cookies.forEach(cookie => headers.append("set-cookie", cookie));
    const output = await previewFetch(() => new Response(null, { headers }), "1");
    expect(output.headers.getSetCookie()).toEqual(cookies);
    expect([...output.headers.keys()].filter(k => k === "x-robots-tag")).toHaveLength(1);
    expect(output.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it("returns the same stream before close and forwards later chunks and cancellation", async () => {
    let controller!: ReadableStreamDefaultController<Uint8Array>;
    const canceled = vi.fn();
    const stream = new ReadableStream<Uint8Array>({ start(c) { controller = c; }, cancel: canceled });
    const responsePromise = previewFetch(() => new Response(stream), "1");
    const output = await responsePromise;
    expect(output.body).toBe(stream);
    const reader = output.body!.getReader();
    controller.enqueue(new TextEncoder().encode("early"));
    expect(new TextDecoder().decode((await reader.read()).value)).toBe("early");
    controller.enqueue(new TextEncoder().encode("later"));
    expect(new TextDecoder().decode((await reader.read()).value)).toBe("later");
    await reader.cancel("client stopped");
    expect(canceled).toHaveBeenCalledWith("client stopped");
  });

  it.each([false, true])("tags generic errors without logging the thrown payload (async=%s)", async (asyncError) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("secret request token payload");
    const output = await previewFetch(() => { if (asyncError) return Promise.reject(error); throw error; }, "1");
    expect(output.status).toBe(500);
    expect(output.headers.get("cache-control")).toBe("no-store");
    expect(output.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(await output.text()).toBe("Preview temporarily unavailable.");
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(PREVIEW_ERROR_DIAGNOSTIC);
  });
});

describe("actual wrapper contract without generated build outputs", () => {
  let fixture: string;
  beforeAll(async () => {
    fixture = await mkdtemp(path.join(tmpdir(), "bs-preview-wrapper-"));
    await mkdir(path.join(fixture, "packages/seo/src"), { recursive: true });
    for (const name of ["negotiate", "preview"]) {
      const source = await readFile(new URL(`../packages/seo/src/${name}.ts`, import.meta.url), "utf8");
      const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
      await writeFile(path.join(fixture, `packages/seo/src/${name}.mjs`), js);
    }
    for (const app of ["people", "agents"]) {
      const appDir = path.join(fixture, "apps", app);
      await mkdir(path.join(appDir, ".open-next"), { recursive: true });
      // Copy the actual wrapper; only TS import extensions are changed for Node's fixture loader.
      const source = await readFile(new URL(`../apps/${app}/worker.mjs`, import.meta.url), "utf8");
      await writeFile(path.join(appDir, "worker.mjs"), source.replaceAll('.ts"', '.mjs"'));
      await writeFile(path.join(appDir, ".open-next/worker.js"), `
        let handler;
        export function setHandler(value) { handler = value; }
        export class DOQueueHandler {}
        export class DOShardedTagCache {}
        export class BucketCachePurge {}
        export default { fetch(...args) { return handler(...args); }, queue() { return "queue preserved"; } };
      `);
      await writeFile(path.join(appDir, ".open-next/package.json"), '{"type":"module"}');
    }
  });
  afterAll(async () => { if (fixture) await rm(fixture, { recursive: true, force: true }); });
  it.each(["people", "agents"])("forwards normalized request/env/ctx and generated exports in %s", async (app) => {
    const base = path.join(fixture, "apps", app);
    const generated = await import(/* @vite-ignore */ pathToFileURL(path.join(base, ".open-next/worker.js")).href);
    const wrapper = await import(/* @vite-ignore */ pathToFileURL(path.join(base, "worker.mjs")).href);
    for (const name of ["DOQueueHandler", "DOShardedTagCache", "BucketCachePurge"]) expect(wrapper[name]).toBe(generated[name]);
    expect(wrapper.default.queue()).toBe("queue preserved");
    const input = new Request(req(), { headers: { accept: "text/markdown", rsc: "1", cookie: "dummy=chunk" } });
    const response = new Response("RSC", { headers: { "content-type": "text/x-component" } });
    const handler = vi.fn(() => response); generated.setHandler(handler);
    const ctx = { waitUntil: vi.fn() }; const env = { BS_PREVIEW: "1" };
    const output = await wrapper.default.fetch(input, env, ctx);
    const [normalized, actualEnv, actualCtx] = handler.mock.calls[0] as unknown as [Request, object, object];
    expect(normalized.url).toBe(input.url);
    expect(normalized.headers.get("accept")).toBe("*/*");
    expect(normalized.headers.get("cookie")).toBe("dummy=chunk");
    expect(actualEnv).toBe(env); expect(actualCtx).toBe(ctx);
    expect(output.headers.get("content-type")).toBe("text/x-component");
    expect(output.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(wrapper.default.fetch(req(), {}, ctx)).toBe(response);
    const rejected = new Error("original failure"); generated.setHandler(() => { throw rejected; });
    expect(() => wrapper.default.fetch(req(), {}, ctx)).toThrow(rejected);
  });
});
