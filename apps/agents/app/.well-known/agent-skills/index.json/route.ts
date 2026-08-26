import { allProducts } from "@bs/db";

export function GET() {
  return Response.json({
    skills: allProducts().map((p) => ({
      name: p.slug,
      description: `Operate ${p.name} via public API/CLI/docs. Agent Twin Score ${p.twin.agent}.`,
      url: `https://buildsomethingagentswant.com/skills/${p.slug}`,
      markdown: `https://buildsomethingagentswant.com/skills/${p.slug}/raw`,
    })),
  });
}
