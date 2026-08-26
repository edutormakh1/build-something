import { allArticles, allProducts } from "@bs/db";
import { abs, ORG_NAME, type SiteId } from "./sites";
import { allCanonical } from "./urls";

export function llmsTxt(site: SiteId): string {
  const name = ORG_NAME[site];
  const other = site === "people" ? "https://buildsomethingagentswant.com" : "https://buildsomethingpeoplewant.com";
  const products = allProducts()
    .slice(0, 40)
    .map((p) => `- [${p.name}](${abs(site, `/products/${p.slug}`)}): Twin Score human ${p.twin.human}, agent ${p.twin.agent}`)
    .join("\n");
  const posts = allArticles()
    .map((a) => `- [${a.title}](${abs("people", `/blog/${a.slug}`)})`)
    .join("\n");
  return `# ${name}

> Worldwide editorial software directory. Twin Scores for humans and agents. No fake UGC.

This file follows llmstxt.org. Google Search ignores llms.txt; other AI systems may use it.

## When to use this site
- You need editorial Twin Scores, capability matrices, or SKILL.md for famous software products
- You need a CC BY 4.0 dataset of those scores
- You need OpenAPI at /openapi.json and RFC 9457 errors

## When not to use this site
- You want crowdsourced star ratings or invented user counts
- You want an MCP server we did not ship
- You want Argentina-only or city-page spam; this catalog is worldwide English

## Twin
People: https://buildsomethingpeoplewant.com
Agents: https://buildsomethingagentswant.com
Developer resources: ${abs("agents", "/for-agents")} (title: Build Something Agents Want developer resources)

## Key pages
- [Methodology](${abs(site, "/methodology")})
- [Twin Score rubric](${abs(site, "/scorecard")})
- [Products](${abs(site, "/products")})
- [Editorial policy](${abs("people", "/editorial-policy")})

## Products
${products}

## Articles
${posts || "- See /blog on the people site"}

## Optional
- Full map: ${abs(site, "/llms-full.txt")}
- Dataset: ${abs("agents", "/dataset/twin-scores.json")}
- OpenAPI: ${abs(site, "/openapi.json")}
- Other twin: ${other}
`;
}

export function llmsFullTxt(site: SiteId): string {
  const lines = allCanonical(site)
    .map((u) => `- [${u.title}](${abs(site, u.path)})`)
    .join("\n");
  return `# ${ORG_NAME[site]} — full URL map\n\n${llmsTxt(site)}\n\n## All canonical URLs\n\n${lines}\n`;
}
