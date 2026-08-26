import { getProduct } from "@bs/db";
import { skillMd } from "@bs/seo";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const p = getProduct(slug);
  if (!p) return new Response("Not found", { status: 404 });
  return new Response(skillMd(slug), { headers: { "content-type": "text/markdown; charset=utf-8" } });
}
