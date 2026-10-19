import { describe, expect, it } from "vitest";
import { isNextInternalRequest, negotiate, normalizeWorkerRequest, shouldSkipAcceptNegotiation, skillMd } from "@bs/seo";
import { GET as skillIndex } from "../apps/agents/app/.well-known/agent-skills/index.json/route";
import { GET as rawSkill } from "../apps/agents/app/skills/[slug]/raw/route";

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

describe("native Flight Worker transport", () => {
  it("keeps C07 acceptable to the real negotiator after Flight markers are removed", () => {
    const input = new Request("http://localhost:20623/products/chatgpt", {
      headers: { accept: "text/x-component", rsc: "1" },
    });
    expect(negotiate(input.headers.get("accept"), ["text/html", "text/markdown"])).toBeNull();
    const normalized = normalizeWorkerRequest(input);
    const middlewareHeaders = new Headers(normalized.headers);
    middlewareHeaders.delete("rsc");
    expect(isNextInternalRequest(middlewareHeaders)).toBe(false);
    expect(negotiate(middlewareHeaders.get("accept"), ["text/html", "text/markdown"])).toBe("text/html");
    expect(normalized.headers.get("rsc")).toBe("1");
  });

  it.each([
    ["GET", "text/x-component"],
    ["HEAD", "text/x-component"],
    ["GET", "text/x-component; charset=utf-8; q=0.5"],
    ["HEAD", "TEXT/X-COMPONENT;q=1.000"],
    ["GET", "application/json, text/x-component;q=0.25"],
  ])("preserves the raw %s Flight request while making %s middleware-compatible", (method, accept) => {
    const controller = new AbortController();
    const input = request({ accept, "next-router-state-tree": "%5B%5D", "next-router-prefetch": "1", "x-custom": "keep" }, {
      method, signal: controller.signal, redirect: "manual", cache: "no-store", credentials: "omit",
      referrer: "http://localhost:4310/products", referrerPolicy: "same-origin", integrity: "sha256-fixture", keepalive: true,
    });
    const normalized = normalizeWorkerRequest(input);
    expect(normalized).not.toBe(input);
    expect(normalized.headers.get("accept")).toBe("*/*");
    expect(input.headers.get("accept")).toBe(accept);
    const expectedHeaders = new Headers(input.headers);
    expectedHeaders.set("accept", "*/*");
    expect(Object.fromEntries(normalized.headers)).toEqual(Object.fromEntries(expectedHeaders));
    for (const key of ["url", "method", "redirect", "credentials", "cache", "mode", "integrity", "keepalive", "referrer", "referrerPolicy"] as const) {
      expect(normalized[key]).toBe(input[key]);
    }
    controller.abort("unit cancellation");
    expect(normalized.signal.aborted).toBe(true);
    expect(normalized.signal.reason).toBe(input.signal.reason);
  });

  it.each([
    { rsc: undefined }, { rsc: "0" }, { rsc: "true" }, { rsc: "01" },
    { action: "" }, { action: "action-id" }, { method: "POST" }, { method: "PUT" },
    { accept: "text/x-component;q=0" }, { accept: "text/x-component;q=0.000, text/html" },
    { accept: "text/x-component;q=-1" }, { accept: "text/x-component;q=1.1" },
    { accept: "text/x-component;q=invalid" }, { accept: "text/x-component;q=1;q=0" },
    { accept: "application/xml" }, { accept: "text/x-component;q=0, application/json" },
    { path: "/api/v1/products" }, { path: "/_next/static/chunk.js" }, { path: "/skills/chatgpt/raw" },
    { path: "/md/products/chatgpt" }, { path: "/robots.txt" }, { path: "/.well-known/api-catalog" }, { path: "/sitemap.xml" },
  ])("leaves nonqualifying native transport unchanged: %j", (options) => {
    const headers = new Headers({ accept: options.accept ?? "text/x-component", rsc: "1" });
    if ("rsc" in options) {
      if (options.rsc === undefined) headers.delete("rsc");
      else headers.set("rsc", options.rsc);
    }
    if ("action" in options) headers.set("next-action", options.action!);
    const input = new Request(`http://localhost:4310${options.path ?? "/products/chatgpt"}?view=full`, {
      method: options.method ?? "GET", headers,
    });
    expect(normalizeWorkerRequest(input)).toBe(input);
  });
});

describe("fixed raw skill resource", () => {
  it("keeps the advertised Markdown download on its authoritative raw handler", async () => {
    const index: { skills: { name: string; markdown: string }[] } = await skillIndex().json();
    const advertised = index.skills.find(skill => skill.name === "chatgpt")!;
    const path = new URL(advertised.markdown).pathname;
    expect(path).toBe("/skills/chatgpt/raw");
    const input = new Request(`http://localhost:4310${path}`, { headers: { accept: "text/markdown" } });
    expect(negotiate(input.headers.get("accept"), ["text/html", "text/markdown"])).toBe("text/markdown");
    expect(shouldSkipAcceptNegotiation(path), "middleware must not rewrite the advertised resource to /md").toBe(true);
    expect(normalizeWorkerRequest(input)).toBe(input);
    const response = await rawSkill(input, { params: Promise.resolve({ slug: advertised.name }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(await response.text()).toBe(skillMd(advertised.name));
  });

  it.each(["GET", "HEAD"])("preserves raw %s request identity, Accept, RSC and query", method => {
    const input = new Request("http://localhost:4310/skills/chatgpt/raw?download=1&label=a%2Fb", {
      method,
      headers: { accept: "text/markdown", rsc: "1", "next-router-state-tree": "%5B%5D", "x-custom": "keep" },
    });
    const normalized = normalizeWorkerRequest(input);
    expect(normalized).toBe(input);
    expect(normalized.method).toBe(method);
    expect(normalized.url).toBe("http://localhost:4310/skills/chatgpt/raw?download=1&label=a%2Fb");
    expect(Object.fromEntries(normalized.headers)).toEqual({ accept: "text/markdown", rsc: "1", "next-router-state-tree": "%5B%5D", "x-custom": "keep" });
  });

  it.each(["/skills/chatgpt/raw", "/skills/unknown-skill/raw", "/skills/a%2Fb/raw"])("skips only the raw resource shape without decoding %s", path => {
    expect(shouldSkipAcceptNegotiation(path)).toBe(true);
  });

  it.each([
    "/skills/chatgpt", "/skills/chatgpt/raw/extra", "/skills/chatgpt/raw/", "/skills//raw",
    "/skills/raw", "/skills/a/b/raw", "/skills/chatgpt/rawish", "/skills/chatgpt/RAW",
    "/skill/chatgpt/raw", "/skills/chatgpt/raw?download=1", "/skills/chatgpt%2Fraw",
  ])("does not broaden the pathname filter or strip queries for %s", path => {
    expect(shouldSkipAcceptNegotiation(path)).toBe(false);
  });

  it.each(["text/html", "text/markdown"])("keeps the normal skill page negotiable as %s", accept => {
    expect(shouldSkipAcceptNegotiation("/skills/chatgpt")).toBe(false);
    expect(negotiate(accept, ["text/html", "text/markdown"])).toBe(accept);
    const input = new Request("http://localhost:4310/skills/chatgpt", { headers: { accept, rsc: "1" } });
    const output = normalizeWorkerRequest(input);
    if (accept === "text/html") expect(output).toBe(input);
    else {
      expect(output).not.toBe(input);
      expect(output.headers.get("accept")).toBe("*/*");
      expect(output.headers.get("rsc")).toBe("1");
    }
  });
});
