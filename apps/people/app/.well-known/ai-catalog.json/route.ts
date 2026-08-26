import { allProducts } from "@bs/db";

export function GET() {
  const body = {
    version: "1.0",
    name: "Build Something People Want",
    description: "Editorial Twin Score catalog for humans. Twin: Build Something Agents Want.",
    website: "https://buildsomethingpeoplewant.com",
    api: "https://buildsomethingpeoplewant.com/api/v1/products",
    openapi: "https://buildsomethingpeoplewant.com/openapi.json",
    llms: "https://buildsomethingpeoplewant.com/llms.txt",
    products: allProducts().map((p) => ({
      slug: p.slug,
      name: p.name,
      url: `https://buildsomethingpeoplewant.com/products/${p.slug}`,
      twin: p.twin,
    })),
  };
  return Response.json(body);
}
