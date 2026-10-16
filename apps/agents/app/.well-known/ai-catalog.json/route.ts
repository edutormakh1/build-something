import { abs, siteUrl } from "@bs/seo";
import { allProducts } from "@bs/db";

export function GET() {
  const body = {
    version: "1.0",
    name: "Build Something Agents Want",
    description: "Machine-first Twin Score catalog for agents. Twin: Build Something People Want.",
    website: siteUrl("agents"),
    api: abs("agents", "/api/v1/products"),
    openapi: abs("agents", "/openapi.json"),
    llms: abs("agents", "/llms.txt"),
    products: allProducts().map((p) => ({
      slug: p.slug,
      name: p.name,
      url: abs("agents", `/products/${p.slug}`),
      twin: p.twin,
    })),
  };
  return Response.json(body);
}
