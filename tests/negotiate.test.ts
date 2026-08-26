import { describe, expect, it } from "vitest";
import { isNextInternalRequest, negotiate } from "../packages/seo/src/negotiate";

describe("accept negotiation", () => {
  it("prefers markdown when asked", () => {
    expect(negotiate("text/markdown", ["text/html", "text/markdown"])).toBe("text/markdown");
  });
  it("prefers html by default", () => {
    expect(negotiate("*/*", ["text/html", "text/markdown"])).toBe("text/html");
  });
  it("returns null when nothing is acceptable", () => {
    expect(negotiate("application/xml", ["text/html", "text/markdown"])).toBeNull();
  });
  it("respects q values", () => {
    expect(negotiate("text/html;q=0.1, text/markdown;q=0.9", ["text/html", "text/markdown"])).toBe("text/markdown");
  });
  it("skips RSC headers", () => {
    const headers = new Map([["rsc", "1"]]);
    expect(isNextInternalRequest({ get: (n: string) => headers.get(n) || null })).toBe(true);
  });
  it("skips Next-Router-State-Tree", () => {
    const headers = new Map([["next-router-state-tree", "%5B%5D"]]);
    expect(isNextInternalRequest({ get: (n: string) => headers.get(n) || null })).toBe(true);
  });
});
