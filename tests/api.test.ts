import { describe, expect, it } from "vitest";
import { listProducts, openApi, problemResponse, productPayload } from "../packages/seo/src/api";

describe("api", () => {
  it("lists products", () => {
    expect(listProducts().length).toBeGreaterThan(40);
  });
  it("returns payload for chatgpt", () => {
    expect(productPayload("chatgpt")?.name).toBe("ChatGPT");
  });
  it("returns RFC 9457 problem objects", () => {
    const p = problemResponse(404, "Not Found", "missing", "/api/v1/products/nope");
    expect(p.body.status).toBe(404);
    expect(p.body.title).toBe("Not Found");
    expect(p.init.headers["content-type"]).toContain("application/problem+json");
  });
  it("builds openapi", () => {
    const spec = openApi("people");
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.paths["/api/v1/products"]).toBeTruthy();
  });
});
