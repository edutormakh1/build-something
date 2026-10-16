import { describe, expect, it } from "vitest";
import { normalizeWorkerRequest } from "@bs/seo";

const url = "http://localhost:4310/products/chatgpt?view=full#details";
function request(headers: HeadersInit = {}, init: RequestInit = {}) {
  return new Request(url, { headers: { accept: "text/markdown", rsc: "1", ...Object.fromEntries(new Headers(headers)) }, ...init });
}

describe("raw Worker RSC normalization", () => {
  it.each([
    ["GET", "text/markdown"],
    ["HEAD", "text/markdown"],
    ["GET", "text/html;q=0.5, text/markdown"],
    ["GET", "text/markdown;q=0.9, text/html;q=0.1"],
  ])("normalizes only the chosen Markdown transport on %s with %s", (method, accept) => {
    const headers = {
      accept, rsc: "1", "next-router-state-tree": "%5B%5D", "next-router-prefetch": "1",
      "next-router-segment-prefetch": "/_tree", "next-hmr-refresh": "1", "next-url": "/products",
      cookie: "session=dummy", referer: "http://localhost:4310/products", "x-custom": "keep",
    };
    const input = request(headers, { method, redirect: "manual", credentials: "include", cache: "no-store" });
    const normalized = normalizeWorkerRequest(input);
    expect(normalized).not.toBe(input);
    expect(normalized.headers.get("accept")).toBe("*/*");
    expect(input.headers.get("accept")).toBe(accept);
    expect(normalized.headers).not.toBe(input.headers);
    for (const [name, value] of Object.entries(headers)) if (name !== "accept") expect(normalized.headers.get(name)).toBe(value);
    for (const key of ["url", "method", "redirect", "credentials", "cache", "mode", "integrity", "keepalive"] as const) expect(normalized[key]).toBe(input[key]);
  });

  it("keeps abort linkage observable in Node when a qualifying request is replaced", () => {
    const controller = new AbortController();
    const input = request({}, { signal: controller.signal });
    const normalized = normalizeWorkerRequest(input);
    expect(normalized).not.toBe(input);
    expect(normalized.signal.aborted).toBe(false);
    controller.abort(new Error("test cancellation"));
    expect(input.signal.aborted).toBe(true);
    expect(normalized.signal.aborted).toBe(true);
    expect(normalized.signal.reason).toBe(input.signal.reason);
  });

  it("retains an already aborted signal", () => {
    const input = request({}, { signal: AbortSignal.abort("already canceled") });
    expect(normalizeWorkerRequest(input).signal.aborted).toBe(true);
    expect(normalizeWorkerRequest(input).signal.reason).toBe("already canceled");
  });

  it.each([
    "text/html", "text/markdown;q=0.9, text/html", "*/*", "application/json", "image/avif", "text/markdown;q=0",
  ])("returns exactly the same request for unchanged Accept %s", (accept) => {
    const input = request({ accept });
    expect(normalizeWorkerRequest(input)).toBe(input);
  });

  it("returns the same request when Accept is missing", () => {
    const input = new Request(url, { headers: { rsc: "1" } });
    expect(normalizeWorkerRequest(input)).toBe(input);
  });

  it.each(["0", "true", "1, 1", "1,1", "01", ""]) ("does not recognize malformed RSC %s", (rsc) => {
    const input = request({ rsc });
    expect(normalizeWorkerRequest(input)).toBe(input);
  });

  it.each([
    {}, { "next-router-prefetch": "1" }, { "next-router-state-tree": "%5B%5D" },
    { "next-router-segment-prefetch": "/_tree" }, { "x-bs-internal": "1" },
  ])("does not infer RSC from other markers %j", (headers) => {
    const input = new Request(url, { headers: { accept: "text/markdown", ...headers } });
    expect(normalizeWorkerRequest(input)).toBe(input);
  });

  it.each(["", "action-id"])("preserves any next-action header, including %s", (value) => {
    const input = request({ "next-action": value });
    expect(normalizeWorkerRequest(input)).toBe(input);
  });

  it.each([{}, { "next-action": "action-id" }])("leaves POST and the original readable body unchanged %j", async (headers) => {
    const input = request(headers, { method: "POST", body: "password=dummy&confirmation=dummy" });
    const output = normalizeWorkerRequest(input);
    expect(output).toBe(input);
    expect(input.bodyUsed).toBe(false);
    expect(await input.text()).toBe("password=dummy&confirmation=dummy");
  });

  it.each(["PUT", "PATCH", "DELETE", "OPTIONS"])("preserves method %s", (method) => {
    const input = request({}, { method });
    expect(normalizeWorkerRequest(input)).toBe(input);
  });

  it.each([
    "/api/v1/products", "/md", "/md/products/chatgpt", "/sitemap.xml", "/sitemaps/products.xml",
    "/_next/data/build/route.json", "/_next/static/chunk.js", "/art/x.png", "/feed.xml", "/atom.xml",
    "/.well-known/api-catalog", "/dataset/twin-scores.csv", "/robots.txt", "/llms-full.txt",
  ])("uses the existing resource filter for %s", (path) => {
    const input = new Request(`http://localhost:4310${path}`, { headers: { rsc: "1", accept: "text/markdown" } });
    expect(normalizeWorkerRequest(input)).toBe(input);
  });

  it.each(["/auth/recovery", "/reset-password", "/products/google-inbox", "/products/chatgpt/", "/products/x%2Fart%2Fx.png%2Fdetail"])("does not invent an additional special-path list or decode %s", (path) => {
    const input = new Request(`http://localhost:4310${path}`, { headers: { rsc: "1", accept: "text/markdown" } });
    const normalized = normalizeWorkerRequest(input);
    expect(normalized).not.toBe(input);
    expect(normalized.headers.get("accept")).toBe("*/*");
    expect(normalized.url).toBe(input.url);
  });
});
