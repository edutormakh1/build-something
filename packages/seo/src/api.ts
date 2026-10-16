import { allProducts, getProduct, reviewsFor, type Product } from "@bs/db";
import {
  apiBadRequest,
  apiNotFound,
  apiRouteNotFound,
  isValidSlug,
  jsonOk,
} from "./problem";
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
    alternatives: prod.alternatives.filter((slug) => Boolean(getProduct(slug))),
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

const PROBLEM_REF = { $ref: "#/components/schemas/ProblemDetails" };

export function openApi(site: SiteId) {
  const base = abs(site, "");
  const title = site === "people" ? "Build Something People Want API" : "Build Something Agents Want API";
  return {
    openapi: "3.1.0",
    info: {
      title,
      version: "1.0.0",
      license: { name: "CC BY 4.0" },
      description:
        "Read-only Twin Score catalog. Errors use RFC 9457 application/problem+json with code, detail, and status.",
    },
    servers: [{ url: base }],
    paths: {
      "/api/v1": {
        get: {
          operationId: "getApiIndex",
          summary: "API discovery",
          description: "Lists public JSON resources and the OpenAPI document.",
          responses: {
            "200": {
              description: "OK",
              content: { "application/json": { schema: { type: "object", additionalProperties: true } } },
            },
            "405": { description: "Problem JSON", content: { "application/problem+json": { schema: PROBLEM_REF } } },
          },
        },
      },
      "/api/v1/products": {
        get: {
          operationId: "listProducts",
          summary: "List products",
          description: "All published catalog products with Twin Scores and capability matrices.",
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["data"],
                    properties: { data: { type: "array", items: { $ref: "#/components/schemas/Product" } } },
                  },
                },
              },
            },
            "405": { description: "Problem JSON", content: { "application/problem+json": { schema: PROBLEM_REF } } },
          },
        },
      },
      "/api/v1/products/{slug}": {
        get: {
          operationId: "getProduct",
          summary: "Get product",
          description: "One catalog product by slug. Unknown slugs return RFC 9457 problem+json.",
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["data"],
                    properties: { data: { $ref: "#/components/schemas/Product" } },
                  },
                },
              },
            },
            "400": { description: "Problem JSON", content: { "application/problem+json": { schema: PROBLEM_REF } } },
            "404": { description: "Problem JSON", content: { "application/problem+json": { schema: PROBLEM_REF } } },
            "405": { description: "Problem JSON", content: { "application/problem+json": { schema: PROBLEM_REF } } },
          },
        },
      },
      "/api/v1/reviews": {
        get: {
          operationId: "listReviews",
          summary: "List reviews",
          description: "Editorial reviews. Filter with ?product={slug}. Invalid slugs return 400; unknown products return 404.",
          parameters: [{ name: "product", in: "query", schema: { type: "string" } }],
          responses: {
            "200": {
              description: "OK",
              content: { "application/json": { schema: { type: "object", required: ["data"], properties: { data: { type: "array" } } } } },
            },
            "400": { description: "Problem JSON", content: { "application/problem+json": { schema: PROBLEM_REF } } },
            "404": { description: "Problem JSON", content: { "application/problem+json": { schema: PROBLEM_REF } } },
            "405": { description: "Problem JSON", content: { "application/problem+json": { schema: PROBLEM_REF } } },
          },
        },
      },
    },
    components: {
      schemas: {
        Product: {
          type: "object",
          additionalProperties: true,
          properties: {
            slug: { type: "string" },
            name: { type: "string" },
            vendor: { type: "string" },
            twin: { type: "object", additionalProperties: true },
          },
        },
        ProblemDetails: {
          type: "object",
          additionalProperties: true,
          required: ["type", "title", "status", "detail", "code"],
          properties: {
            type: { type: "string", format: "uri" },
            title: { type: "string" },
            status: { type: "integer", minimum: 400, maximum: 599 },
            detail: { type: "string" },
            instance: { type: "string" },
            code: { type: "string" },
            resolution: { type: "string" },
          },
        },
      },
    },
  };
}

export function apiCatalog(site: SiteId) {
  return {
    linkset: [
      {
        anchor: abs(site, "/api/v1/products"),
        "service-desc": [{ href: abs(site, "/openapi.json"), type: "application/vnd.oai.openapi+json" }],
        "service-doc": [
          {
            href: abs(site, site === "agents" ? "/api" : "/for-agents"),
            type: "text/html",
          },
        ],
      },
    ],
  };
}

export function apiIndexPayload(site: SiteId) {
  return {
    name: site === "people" ? "Build Something People Want API" : "Build Something Agents Want API",
    version: "1.0.0",
    openapi: "/openapi.json",
    llms: "/llms.txt",
    errors: "RFC 9457 application/problem+json with code, detail, and status",
    resources: {
      products: "/api/v1/products",
      product: "/api/v1/products/{slug}",
      reviews: "/api/v1/reviews",
    },
  };
}

export function handleApiIndex(site: SiteId): Response {
  return new Response(JSON.stringify(apiIndexPayload(site)), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, HEAD, OPTIONS",
    },
  });
}

export function handleListProducts(): Response {
  return jsonOk(listProducts());
}

export function handleGetProduct(slug: string, instance: string): Response {
  if (!slug || !isValidSlug(slug)) {
    return apiBadRequest(instance, `Invalid product slug '${slug || ""}'.`);
  }
  const data = productPayload(slug);
  if (!data) return apiNotFound(instance, `No product '${slug}'`);
  return jsonOk(data);
}

export function handleListReviews(product: string | null, instance: string): Response {
  if (product !== null && product !== undefined) {
    if (product === "" || !isValidSlug(product)) {
      return apiBadRequest(instance, "Query parameter 'product' must be a valid catalog slug.");
    }
    if (!getProduct(product)) {
      return apiNotFound(instance, `No product '${product}'`);
    }
  }
  return jsonOk(reviewsPayload(product || undefined));
}

export function handleUnknownApiRoute(instance: string): Response {
  return apiRouteNotFound(instance);
}

