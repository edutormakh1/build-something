import { sitemapEntries, sitemapXml } from "@bs/seo";

export function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  return handler(ctx);
}

async function handler(ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  const slice = sitemapEntries("people", name);
  if (!slice) return new Response("Not found", { status: 404 });
  return new Response(sitemapXml("people", slice), { headers: { "content-type": "application/xml; charset=utf-8" } });
}
