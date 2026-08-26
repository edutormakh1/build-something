import { problemResponse, productPayload } from "@bs/seo";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const data = productPayload(slug);
  if (!data) {
    const p = problemResponse(404, "Not Found", `No product '${slug}'`, `/api/v1/products/${slug}`);
    return Response.json(p.body, p.init);
  }
  return Response.json({ data });
}
