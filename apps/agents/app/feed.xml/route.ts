import { allArticles, allProducts } from "@bs/db";

export function GET() {
  const items = [
    ...allArticles().map((a) => `<item><title>${esc(a.title)}</title><link>https://buildsomethingagentswant.com/products/${a.slug}</link><guid>https://buildsomethingagentswant.com/products/${a.slug}</guid><pubDate>${a.publishedAt}</pubDate><description>${esc(a.description)}</description></item>`),
    ...allProducts().slice(0, 20).map((p) => `<item><title>${esc(p.name)}</title><link>https://buildsomethingagentswant.com/products/${p.slug}</link><guid>https://buildsomethingagentswant.com/products/${p.slug}</guid><description>${esc(p.description)}</description></item>`),
  ].join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Build Something Agents Want</title><link>https://buildsomethingagentswant.com</link><description>Editorial Twin Score directory</description>${items}</channel></rss>`;
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8" } });
}
function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}
