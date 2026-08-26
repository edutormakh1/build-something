import { allCanonical, agentsStatic, sitemapXml } from "@bs/seo";

export function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  return handler(ctx);
}

async function handler(ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  const all = allCanonical("agents");
  let slice = all;
  if (name === "pages.xml") slice = agentsStatic();
  else if (name === "products.xml") slice = all.filter((u) => u.path.startsWith("/products") || u.path.startsWith("/skills") || u.path.startsWith("/categories"));
  else if (name === "editorial.xml") slice = all.filter((u) => u.path === "/methodology" || u.path === "/scorecard" || u.path === "/about" || u.path === "/for-agents" || u.path === "/api");
  else return new Response("Not found", { status: 404 });
  return new Response(sitemapXml("agents", slice), { headers: { "content-type": "application/xml; charset=utf-8" } });
}
