import { allProducts } from "@bs/db";

export function GET() {
  const body = {
    version: "1.0",
    name: "Build Something Agents Want",
    description: "Machine-first Twin Score catalog for agents. Twin: Build Something People Want.",
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
