import { abs } from "@bs/seo";
import { allArticles } from "@bs/db";
export function GET() {
  const entries = allArticles().map((a) => `<entry><title>${a.title.replace(/&/g, "&amp;")}</title><link href="${esc(abs("people", `/blog/${a.slug}`))}"/><id>https://buildsomethingagentswant.com/blog/${a.slug}</id><updated>${a.updatedAt}</updated><summary>${a.description.replace(/&/g, "&amp;")}</summary></entry>`).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Build Something Agents Want</title><link href="${esc(abs("agents", "/atom.xml"))}" rel="self"/><updated>2026-08-25T00:00:00Z</updated><id>https://buildsomethingagentswant.com/</id>${entries}</feed>`;
  return new Response(xml, { headers: { "content-type": "application/atom+xml; charset=utf-8" } });
}

function esc(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}
