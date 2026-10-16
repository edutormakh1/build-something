import { allArticles, allProducts } from "@bs/db";
import { abs, ORG_NAME, ORG_TAGLINE, siblingUrl, siteUrl, type SiteId } from "./sites";
import { allCanonical } from "./urls";

export function llmsTxt(site: SiteId): string {
  const name = ORG_NAME[site];
  const other = siblingUrl(site);
  const products = allProducts()
    .slice(0, 40)
    .map((p) => {
      const page = abs(site, `/products/${p.slug}`);
      const skill = site === "agents" ? ` · [SKILL.md](${abs("agents", `/skills/${p.slug}`)})` : "";
      return `- [${p.name}](${page}): Twin Score human ${p.twin.human}, agent ${p.twin.agent}${skill}`;
    })
    .join("\n");
  const posts = allArticles()
    .map((a) => `- [${a.title}](${abs("people", `/blog/${a.slug}`)})`)
    .join("\n");
  const skillIndex =
    site === "agents"
      ? `- [Agent skills index](${abs("agents", "/.well-known/agent-skills/index.json")})\n- [SKILL.md example](${abs("agents", "/skills/chatgpt")})\n`
      : "";
  return `# ${name}

> ${ORG_TAGLINE[site]}

This file follows llmstxt.org. Google Search ignores llms.txt (it will not help or harm Google rankings). Other AI systems may use it as a map.

Twin Scores are legacy editorial estimates on a 0–100 scale. No firsthand product-test log or per-dimension scoring worksheet is attached to these retained scores. Dated documentation checks establish only the specific product facts they cite; they do not validate the scores. We do not emit AggregateRating for Twin Scores. A scored review uses its own audience score on the native 0–100 scale. We do not ship fake UGC reviews.

The bylines are catalog attributions; this evidence register contains agent documentation review dated 2026-10-16, with a responsible human editor unassigned. Professional history and firsthand product evaluations are not independently verified in this evidence register.

## When to use this site
- You need editorial Twin Scores, capability matrices, or SKILL.md for famous software products
- You need a CC BY 4.0 dataset of those scores
- You need OpenAPI at /openapi.json and RFC 9457 errors
- You need server-rendered HTML (H1, first-paragraph answer, JSON-LD) even if the visual layer is a 3D canvas

## When not to use this site
- You want crowdsourced star ratings or invented user counts
- You want an MCP server we did not ship
- You want Argentina-only or city-page spam; this catalog is worldwide English

## Key facts
- Editor: Edu Tor (${abs("people", "/authors/edu-tor")}) — catalog attribution; identity and professional history unverified
- Twin sites share product slugs. People = magazine prose. Agents = matrices, SKILL.md, dataset.
- Methodology: ${abs(site, "/methodology")}
- Rubric: ${abs(site, "/scorecard")}
- Dataset (CC BY 4.0): ${abs("agents", "/dataset/twin-scores.json")} and ${abs("agents", "/dataset/twin-scores.csv")}
- AI crawlers are allowed in /robots.txt (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended, and others)
- Request Accept: text/markdown for a text/markdown; charset=utf-8 representation of canonical pages

## Twin
People: ${siteUrl("people")}
Agents: ${siteUrl("agents")}
Developer resources: ${abs("agents", "/for-agents")} (title: Build Something Agents Want developer resources)

## Public API
- JSON list: ${abs(site, "/api/v1/products")}
- JSON product: ${abs(site, "/api/v1/products/{slug}")}
- JSON reviews: ${abs(site, "/api/v1/reviews")}
- OpenAPI: ${abs(site, "/openapi.json")}
- API catalog: ${abs(site, "/.well-known/api-catalog")}
- Errors: RFC 9457 application/problem+json with code, detail, and status (400/404/405 on /api/v1/*)

## Key pages
- [Methodology](${abs(site, "/methodology")})
- [Twin Score rubric](${abs(site, "/scorecard")})
- [Products](${abs(site, "/products")})
- [Editorial policy](${abs("people", "/editorial-policy")})
- [About](${abs(site, "/about")})
- [AI catalog](${abs(site, "/.well-known/ai-catalog.json")})
- [OpenAPI](${abs(site, "/openapi.json")})
- [JSON API](${abs(site, "/api/v1/products")})
${skillIndex}
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

