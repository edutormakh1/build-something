import { allProducts, getProduct, reviewsFor, type Product } from "@bs/db";
import { problemResponse } from "./problem";
import type { SiteId } from "./sites";
import { abs } from "./sites";

export function listProducts() {
  return allProducts().map(serializeProduct);
}

export function serializeProduct(prod: Product) {
  return {
    slug: prod.slug,
    name: prod.name,
    vendor: prod.vendor,
    website: prod.website,
    description: prod.description,
    category: prod.category,
    twin: prod.twin,
    capabilities: prod.capabilities,
    alternatives: prod.alternatives,
    pricing: prod.pricing,
  };
}

export function productPayload(slug: string) {
  const p = getProduct(slug);
  if (!p) return null;
  return { ...serializeProduct(p), reviews: reviewsFor(slug).map((r) => ({ slug: r.slug, kind: r.kind, title: r.title })) };
}

export function reviewsPayload(product?: string) {
  if (product) return reviewsFor(product);
  return allProducts().flatMap((p) => reviewsFor(p.slug)).slice(0, 200);
}

export function openApi(site: SiteId) {
  const base = abs(site, "");
  return {
    openapi: "3.1.0",
    info: {
      title: site === "people" ? "Build Something People Want API" : "Build Something Agents Want API",
      version: "1.0.0",
      license: { name: "CC BY 4.0" },
    },
    servers: [{ url: base }],
    paths: {
      "/api/v1/products": { get: { summary: "List products", responses: { "200": { description: "OK" } } } },
      "/api/v1/products/{slug}": { get: { summary: "Get product", parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" }, "404": { description: "Problem JSON" } } } },
      "/api/v1/reviews": { get: { summary: "List reviews", parameters: [{ name: "product", in: "query", schema: { type: "string" } }], responses: { "200": { description: "OK" } } } },
    },
  };
}

export { problemResponse };
