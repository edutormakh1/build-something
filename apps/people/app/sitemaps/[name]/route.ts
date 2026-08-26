import { allCanonical, peopleStatic, sitemapXml } from "@bs/seo";

export function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  return handler(ctx);
}

async function handler(ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  const all = allCanonical("people");
  let slice = all;
  if (name === "pages.xml") slice = peopleStatic();
  else if (name === "products.xml") slice = all.filter((u) => u.path.startsWith("/products") || u.path.startsWith("/alternatives") || u.path.startsWith("/categories") || u.path.startsWith("/best") || u.path.startsWith("/compare"));
  else if (name === "editorial.xml") slice = all.filter((u) => u.path.startsWith("/reviews") || u.path.startsWith("/blog") || u.path.startsWith("/authors") || u.path === "/methodology" || u.path === "/editorial-policy" || u.path === "/scorecard");
  else return new Response("Not found", { status: 404 });
  return new Response(sitemapXml("people", slice), { headers: { "content-type": "application/xml; charset=utf-8" } });
}
