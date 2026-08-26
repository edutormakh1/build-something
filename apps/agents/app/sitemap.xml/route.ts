import { sitemapIndexXml } from "@bs/seo";

export function GET() {
  const xml = sitemapIndexXml("agents", [
    "/sitemaps/pages.xml",
    "/sitemaps/products.xml",
    "/sitemaps/editorial.xml",
  ]);
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8" } });
}
