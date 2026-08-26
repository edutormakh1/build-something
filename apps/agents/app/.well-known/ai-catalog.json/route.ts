import { allProducts } from "@bs/db";

export function GET() {
  const body = {
    version: "1.0",
    name: "Build Something Agents Want",
    description: "Editorial Twin Score catalog for humans. Twin: Build Something Agents Want.",
    website: "https://buildsomethingagentswant.com",
    api: "https://buildsomethingagentswant.com/api/v1/products",
    openapi: "https://buildsomethingagentswant.com/openapi.json",
    llms: "https://buildsomethingagentswant.com/llms.txt",
    products: allProducts().map((p) => ({
      slug: p.slug,
      name: p.name,
      url: `https://buildsomethingagentswant.com/products/${p.slug}`,
      twin: p.twin,
    })),
  };
  return Response.json(body);
}
