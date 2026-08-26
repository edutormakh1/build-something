import { allProducts, catalog } from "@bs/db";

export function GET() {
  const body = {
    license: catalog.license,
    generatedAt: catalog.generatedAt,
    rubric: catalog.rubric,
    products: allProducts().map((p) => ({
      slug: p.slug,
      name: p.name,
      vendor: p.vendor,
      category: p.category,
      human: p.twin.human,
      agent: p.twin.agent,
      updated: p.twin.updated,
      api: p.capabilities.api,
      mcp: p.capabilities.mcp,
      cli: p.capabilities.cli,
    })),
  };
  return Response.json(body);
}
