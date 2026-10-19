import { abs, siteUrl } from "@bs/seo";
import { allProducts } from "@bs/db";

export function GET() {
  const body = {
    version: "1.0",
    name: "Build Something People Want",
    description: "Editorial Twin Score catalog for humans. Twin: Build Something Agents Want.",
    website: siteUrl("people"),
    api: abs("people", "/api/v1/products"),
    openapi: abs("people", "/openapi.json"),
    llms: abs("people", "/llms.txt"),
    products: allProducts().map((p) => ({
      slug: p.slug,
      name: p.name,
      url: abs("people", `/products/${p.slug}`),
      twin: p.twin,
    })),
  };
  return Response.json(body);
}
