import { describe, expect, it } from "vitest";
import {
  apiIndexPayload,
  handleGetProduct,
  handleListReviews,
  handleUnknownApiRoute,
  listProducts,
  openApi,
  productPayload,
} from "../packages/seo/src/api";
import { defaultProblemCode, problemJson, problemResponse } from "../packages/seo/src/problem";

describe("api", () => {
  it("lists products", () => {
    expect(listProducts().length).toBeGreaterThan(40);
  });
  it("returns payload for chatgpt", () => {
    expect(productPayload("chatgpt")?.name).toBe("ChatGPT");
  });
  it("returns RFC 9457 problem objects with code, detail, status", () => {
    const p = problemResponse(404, "Not Found", "missing", "/api/v1/products/nope");
    expect(p.body.status).toBe(404);
    expect(p.body.title).toBe("Not Found");
    expect(p.body.detail).toBe("missing");
    expect(p.body.code).toBe("not_found");
    expect(p.body.resolution).toBeTruthy();
    expect(p.init.headers["content-type"]).toContain("application/problem+json");
    expect(defaultProblemCode(400)).toBe("bad_request");
    expect(defaultProblemCode(405)).toBe("method_not_allowed");
  });
  it("builds problem JSON responses without using application/json", async () => {
    const res = problemJson(405, "Method not allowed", "read-only", { instance: "/api/v1/products", code: "method_not_allowed" });
    expect(res.status).toBe(405);
    expect(res.headers.get("content-type")).toContain("application/problem+json");
    const body = await res.json();
    expect(body.code).toBe("method_not_allowed");
    expect(body.status).toBe(405);
    expect(body.detail).toBeTruthy();
  });
  it("404s unknown products and 400s invalid slugs", async () => {
    const missing = handleGetProduct("not-a-product", "/api/v1/products/not-a-product");
    expect(missing.status).toBe(404);
    expect(missing.headers.get("content-type")).toContain("application/problem+json");
    const missBody = await missing.json();
    expect(missBody.code).toBe("not_found");
    const bad = handleGetProduct("Not A Slug!", "/api/v1/products/Not%20A%20Slug!");
    expect(bad.status).toBe(400);
    expect((await bad.json()).code).toBe("bad_request");
  });
  it("400s invalid review filters and 404s unknown products", async () => {
    const bad = handleListReviews("", "/api/v1/reviews");
    expect(bad.status).toBe(400);
    const missing = handleListReviews("not-a-product", "/api/v1/reviews");
    expect(missing.status).toBe(404);
  });
  it("404s unknown API routes as problem+json", async () => {
    const res = handleUnknownApiRoute("/api/v1/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toContain("application/problem+json");
    expect((await res.json()).code).toBe("api_route_not_found");
  });
  it("builds openapi with typed problem errors", () => {
    const spec = openApi("people");
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.paths["/api/v1/products"]).toBeTruthy();
    expect(spec.components.schemas.ProblemDetails.required).toContain("code");
    expect(spec.paths["/api/v1/products/{slug}"].get.responses["404"]).toBeTruthy();
    expect(apiIndexPayload("agents").resources.products).toBe("/api/v1/products");
  });
});
