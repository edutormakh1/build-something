import { abs } from "@bs/seo";
import { allProducts } from "@bs/db";

export function GET() {
  return Response.json({
    skills: allProducts().map((p) => ({
      name: p.slug,
      description: `Operate ${p.name} via public API/CLI/docs. Agent Twin Score ${p.twin.agent}.`,
      url: abs("agents", `/skills/${p.slug}`),
      markdown: abs("agents", `/skills/${p.slug}/raw`),
    })),
  });
}
