import {
  allProducts,
  catalog,
  getArticle,
  getAuthor,
  getCategory,
  getProduct,
  getReview,
  productsInCategory,
  reviewsFor,
} from "@bs/db";
import { abs, ORG_NAME, ORG_TAGLINE, siblingUrl, siteUrl, type SiteId } from "./sites";
import { allCanonical } from "./urls";
import { resolveComparison, type ComparisonPage } from "./comparisons";

function h(level: number, text: string): string {
  return `${"#".repeat(level)} ${text}`;
}

const SCORE_LIMITS = "Twin Scores are legacy editorial estimates on a 0–100 scale. No firsthand product-test log or per-dimension scoring worksheet is attached to these retained scores. Dated documentation checks establish only the specific product facts they cite; they do not validate the scores.";
const RESEARCH_LIMITS = "The bylines are catalog attributions; this evidence register contains agent documentation review dated 2026-10-16, with a responsible human editor unassigned. Professional history and firsthand product evaluations are not independently verified in this evidence register.";
const SUBMISSION_LIMITS = "Submissions are stored separately as pending when the submission service is configured. Public reviews are read from the committed catalog; approving a database row does not publish it here. No automated submission-to-publication workflow is enabled in this version.";

function withScoreLimits(body: string): string {
  return body.includes(SCORE_LIMITS) ? body : `${body}\n${SCORE_LIMITS}\n`;
}

export type MarkdownResult =
  | { status: 200; body: string; canonicalPath?: string; robots?: string }
  | { status: 308; body: ""; location: string }
  | { status: 404 | 410; body: string };

export function pageMarkdown(site: SiteId, pathname: string): MarkdownResult {
  const path = pathname.replace(/\/$/, "") || "/";
  const retired = catalog.retiredSlugs.find((s) => path.endsWith("/" + s) || path.includes("/" + s + "/"));
  if (retired && (path.includes("/products/") || path.includes("/skills/") || path.includes("/alternatives/"))) {
    return { status: 410, body: goneMd(site, retired) };
  }

  if (path === "/") return { status: 200, body: homeMd(site) };
  if (path === "/products") return { status: 200, body: productsIndexMd(site) };
  if (path === "/methodology") return { status: 200, body: methodologyMd(site) };
  if (path === "/scorecard") return { status: 200, body: scorecardMd(site) };
  if (path === "/about") return { status: 200, body: aboutMd(site) };
  if (path === "/api") return { status: 200, body: apiMd(site) };
  if (path === "/for-agents") return { status: 200, body: forAgentsMd(site) };

  const prod = path.match(/^\/products\/([^/]+)$/);
  if (prod) {
    const p = getProduct(prod[1]);
    if (!p) return { status: 404, body: notFoundMd(site, path) };
    return { status: 200, body: productMd(site, p.slug) };
  }
  const cat = path.match(/^\/categories\/([^/]+)$/);
  if (cat) {
    const c = getCategory(cat[1]);
    if (!c) return { status: 404, body: notFoundMd(site, path) };
    return { status: 200, body: categoryMd(site, c.slug) };
  }
  if (site === "people") {
    const best = path.match(/^\/best\/([^/]+)$/);
    if (best) {
      const c = getCategory(best[1]);
      if (!c) return { status: 404, body: notFoundMd(site, path) };
      return { status: 200, body: bestMd(c.slug) };
    }
    const cmp = path.match(/^\/compare\/([^/]+)$/);
    if (cmp) {
      const result = resolveComparison(cmp[1]);
      if (result.kind === "not-found") {
        return { status: 404, body: notFoundMd(site, path) };
      }
      if (result.kind === "redirect") return { status: 308, location: result.path, body: "" };
      return {
        status: 200, body: compareMd(result), canonicalPath: result.path,
        ...(result.indexable ? {} : { robots: "noindex, follow" }),
      };
    }
    const alt = path.match(/^\/alternatives\/([^/]+)$/);
    if (alt) {
      const p = getProduct(alt[1]);
      if (!p) return { status: 404, body: notFoundMd(site, path) };
      return { status: 200, body: altMd(p.slug) };
    }
    const rev = path.match(/^\/reviews\/([^/]+)$/);
    if (rev) {
      const r = getReview(rev[1]);
      if (!r) return { status: 404, body: notFoundMd(site, path) };
      return { status: 200, body: reviewMd(r.slug) };
    }
    const author = path.match(/^\/authors\/([^/]+)$/);
    if (author) {
      const a = getAuthor(author[1]);
      if (!a) return { status: 404, body: notFoundMd(site, path) };
      return { status: 200, body: authorMd(a.slug) };
    }
    const blog = path.match(/^\/blog\/([^/]+)$/);
    if (blog) {
      const a = getArticle(blog[1]);
      if (!a) return { status: 404, body: notFoundMd(site, path) };
      return { status: 200, body: `${h(1, a.title)}\n\n${a.body}\n` };
    }
  } else {
    const skill = path.match(/^\/skills\/([^/]+)$/);
    if (skill) {
      const p = getProduct(skill[1]);
      if (!p) return { status: 404, body: notFoundMd(site, path) };
      return { status: 200, body: skillMd(p.slug) };
    }
  }

  const known = allCanonical(site).find((u) => u.path === path);
  if (known) {
    return {
      status: 200,
      body: `${h(1, known.title)}\n\n${ORG_TAGLINE[site]}\n\nThis page is ${known.title} on ${ORG_NAME[site]}. Twin site: ${siblingUrl(site)}.\n`,
    };
  }
  return { status: 404, body: notFoundMd(site, path) };
}

function homeMd(site: SiteId): string {
  const top = allProducts()
    .slice()
    .sort((a, b) => (site === "people" ? b.twin.human - a.twin.human : b.twin.agent - a.twin.agent))
    .slice(0, 12)
    .map((p) => `- [${p.name}](/products/${p.slug}) — Twin Score human ${p.twin.human}, agent ${p.twin.agent}`)
    .join("\n");
  const lead =
    site === "people"
      ? "Build Something People Want is a worldwide editorial directory of software scored for humans and agents. A Twin Score is two retained legacy editorial estimates from 0 to 100 — not crowdsourced stars and not invented user counts. The twin site keeps the same entity slugs for machines."
      : "Build Something Agents Want is the machine-first twin of Build Something People Want. Same product slugs and Twin Scores; capability matrices, SKILL.md, OpenAPI, and a CC BY 4.0 dataset instead of magazine prose. We do not ship a fake MCP manifest.";
  return withScoreLimits(`${h(1, ORG_NAME[site])}\n\n${lead}\n\n${h(2, "How Twin Scores work")}\n\n${h(3, "Two numbers, one entity")}\n\n${RESEARCH_LIMITS} We do not emit AggregateRating for Twin Scores. A scored review uses its own audience score on the native 0–100 scale. Meaning lives in server-rendered HTML even when a 3D canvas is present.\n\n${h(2, "Featured products")}\n\n${top}\n\nSee also: [methodology](/methodology), [scorecard](/scorecard), twin site ${siblingUrl(site)}.\n`);
}

function productsIndexMd(site: SiteId): string {
  const rows = allProducts()
    .map((p) => `- [${p.name}](/products/${p.slug}) (${p.vendor}) human ${p.twin.human} / agent ${p.twin.agent}`)
    .join("\n");
  return withScoreLimits(`${h(1, "All products")}\n\nA worldwide catalog of ${allProducts().length} software products with Twin Scores for humans and agents. Filter on the HTML site; this markdown list is complete.\n\n${h(2, "Directory")}\n\n${h(3, "Published entities")}\n\n${rows}\n`);
}

function productMd(site: SiteId, slug: string): string {
  const p = getProduct(slug)!;
  const cap = p.capabilities;
  const revs = reviewsFor(slug)
    .map((r) => `- [${r.title}](/reviews/${r.slug}) (${r.kind})`)
    .join("\n");
  return withScoreLimits(`${h(1, p.name)}\n\n${p.longDescription}\n\n${h(2, "Twin Score")}\n\nHuman ${p.twin.human}. Agent ${p.twin.agent}. Catalog score date ${p.twin.updated}. Rubric: /scorecard.\n\n${h(3, "Capability matrix")}\n\n- API: ${cap.api}\n- MCP: ${cap.mcp}\n- CLI: ${cap.cli}\n- Docs: ${cap.docs}\n- Auth: ${cap.auth}\n- SDKs: ${cap.sdks.join(", ") || "none listed"}\n\n${h(2, "Facts")}\n\nVendor ${p.vendor}. Founded ${p.founded}. HQ ${p.headquarters}. Pricing: ${p.pricing}. Website: ${p.website}.\n\n${h(2, "Editorial reviews")}\n\n${revs || "None yet."}\n\nTwin page: ${siblingUrl(site)}/products/${slug}\n`);
}

function categoryMd(site: SiteId, slug: string): string {
  const c = getCategory(slug)!;
  const items = productsInCategory(slug)
    .map((p) => `- [${p.name}](/products/${p.slug})`)
    .join("\n");
  return `${h(1, c.name)}\n\n${c.description}\n\n${h(2, "Products in this category")}\n\n${h(3, "Published list")}\n\n${items}\n`;
}

function bestMd(slug: string): string {
  const c = getCategory(slug)!;
  const items = productsInCategory(slug)
    .slice()
    .sort((a, b) => b.twin.human - a.twin.human)
    .map((p, i) => `${i + 1}. [${p.name}](/products/${p.slug}) — human Twin Score ${p.twin.human}`)
    .join("\n");
  return withScoreLimits(`${h(1, `Best ${c.name} software in 2026`)}\n\nRanking by retained legacy editorial estimates for ${c.name}. Not a paid placement list and not a fake user poll.\n\n${h(2, "Ranked list")}\n\n${h(3, "How we ordered it")}\n\nWe sort published catalog products in this category by the human Twin Score. Agent scores live on the twin site.\n\n${items}\n`);
}

function compareMd({ a: pa, b: pb, intro: curatedIntro }: ComparisonPage): string {
  const intro = curatedIntro ?? `${pa.name} versus ${pb.name} compared on Twin Scores.`;
  return withScoreLimits(`${h(1, `${pa.name} vs ${pb.name}`)}\n\n${intro}\n\n${h(2, "Twin Scores")}\n\n| Product | Human | Agent |\n|---|---:|---:|\n| ${pa.name} | ${pa.twin.human} | ${pa.twin.agent} |\n| ${pb.name} | ${pb.twin.human} | ${pb.twin.agent} |\n\n${h(3, "Capability snapshot")}\n\n${pa.name} API ${pa.capabilities.api}, CLI ${pa.capabilities.cli}. ${pb.name} API ${pb.capabilities.api}, CLI ${pb.capabilities.cli}.\n\nRead each product: /products/${pa.slug} and /products/${pb.slug}.\n`);
}

function altMd(slug: string): string {
  const p = getProduct(slug)!;
  const alts = p.alternatives
    .map(getProduct)
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .map((x) => `- [${x.name}](/products/${x.slug}) — human ${x.twin.human}, agent ${x.twin.agent}`)
    .join("\n");
  return withScoreLimits(`${h(1, `Alternatives to ${p.name}`)}\n\n${p.name} is made by ${p.vendor}. These editorial alternatives share a job-to-be-done, not an affiliate relationship.\n\n${h(2, "Shortlist")}\n\n${h(3, "Why these")}\n\nWe link only to other published catalog entities.\n\n${alts}\n`);
}

function reviewMd(slug: string): string {
  const r = getReview(slug)!;
  const p = getProduct(r.product);
  const author = getAuthor(r.author);
  return withScoreLimits(`${h(1, r.title)}\n\n${r.body}\n\n${h(2, "About this review")}\n\n${r.kind === "public_quote" ? "Public documentation note (editorial paraphrase). Unscored documentation note." : "Review attribution recorded in the catalog; no firsthand test record attached."} Kind: ${r.kind}. Status: ${r.status}. Author: ${author?.name ?? r.author}. Product: ${p?.name ?? r.product}. ${r.sourceUrl ? `Source: ${r.sourceUrl}` : "Catalog editorial attribution; not UGC."}\n\n${h(3, "Scores")}\n\nHuman ${r.scoreHuman ?? "n/a"}; agent ${r.scoreAgent ?? "n/a"}.\n`);
}

function authorMd(slug: string): string {
  const a = getAuthor(slug)!;
  return `${h(1, a.name)}\n\n${a.bio}\n\n${h(2, "Attribution and evidence status")}\n\n${a.credentials}\n\n${h(3, "Role")}\n\n${a.role}\n`;
}

function methodologyMd(site: SiteId): string {
  return withScoreLimits(`${h(1, "Methodology")}\n\n${SCORE_LIMITS} ${RESEARCH_LIMITS} We do not scrape app-store stars, invent user counts, or sell placement.\n\n${h(2, "Sources")}\n\nDated documentation checks support only their cited claims. Optional public_quote rows are editorial paraphrases with a source URL, not direct quotations or user testimony. ${SUBMISSION_LIMITS}\n\n${h(3, "Updates")}\n\nScores retain their original catalog dates. Public catalog pages read the committed catalog. Account submissions are separate and do not publish automatically. The exports reproduce summaries and gaps from final estimates; they do not contain the original scoring observations.\n\nSite: ${siteUrl(site)}\n`);
}

function scorecardMd(site: SiteId): string {
  const hDims = catalog.rubric.human.map((d) => `- ${d.label} (${d.weight}%)`).join("\n");
  const aDims = catalog.rubric.agent.map((d) => `- ${d.label} (${d.weight}%)`).join("\n");
  return withScoreLimits(`${h(1, "Twin Score rubric")}\n\n${catalog.rubric.notes}\n\n${h(2, "Human dimensions")}\n\n${hDims}\n\n${h(3, "Agent dimensions")}\n\n${aDims}\n\nDownload: ${site === "agents" ? "/dataset/twin-scores.json" : siblingUrl("people") + "/dataset/twin-scores.json"}\n`);
}

function aboutMd(site: SiteId): string {
  return withScoreLimits(`${h(1, `About ${ORG_NAME[site]}`)}\n\n${ORG_TAGLINE[site]} ${RESEARCH_LIMITS} Two domains, one entity graph. Worldwide English, not a local directory.\n\n${h(2, "What we are not")}\n\nWe are not an affiliate roundup mill, not a fake review marketplace, and not a purple SaaS landing page.\n\n${h(3, "Contact")}\n\neditor@${site === "people" ? "buildsomethingpeoplewant.com" : "buildsomethingagentswant.com"}\n`);
}

function apiMd(site: SiteId): string {
  return withScoreLimits(`${h(1, "API docs")}\n\nPublic JSON API sourced from the committed catalog. No key is required for read. Numeric scores and capability grades are retained catalog judgments; documentation checks do not validate product quality.\n\n${RESEARCH_LIMITS}\n\nEndpoints: ${abs(site, "/api/v1")}, ${abs(site, "/api/v1/products")}, ${abs(site, "/api/v1/reviews")}. OpenAPI: ${abs(site, "/openapi.json")}. Errors retain RFC 9457 application/problem+json.\n\nDataset JSON includes rubric notes; CSV contains the same legacy numeric estimates without a separate evidence record.\n`);
}

function forAgentsMd(site: SiteId): string {
  const title =
    site === "agents"
      ? "Build Something Agents Want developer resources"
      : "For agents";
  return withScoreLimits(`${h(1, title)}\n\nMachine-readable catalog, Twin Score dataset, OpenAPI, llms.txt, and SKILL.md files. ${RESEARCH_LIMITS} Dataset exports retain legacy estimates; they reproduce summaries, not the original scoring observations. Use these when you need structured facts. Do not use them when you need a human screenshot walkthrough — that lives on the people site.\n\n${h(2, "When to use")}\n\n- You need slugs, Twin Scores, and capability matrices\n- You need SKILL.md for a product\n- You need RFC 9457 errors from the API\n\n${h(3, "When not to use")}\n\n- You want fake UGC\n- You want an unofficial MCP we did not ship\n- You want Argentina-local listings; this directory is worldwide\n`);
}

export function skillMd(slug: string): string {
  const p = getProduct(slug);
  if (!p) return "";
  const cap = p.capabilities;
  return withScoreLimits(`---
name: ${p.slug}
description: Operate ${p.name} as an agent using public APIs, CLIs, and docs. Twin Score agent ${p.twin.agent}.
---

# ${p.name} skill

${p.longDescription}

## When to use

Use this skill when a user asks to integrate, script, or evaluate ${p.name} (${p.vendor}).

## When not to use

Do not claim an MCP server exists unless the capability matrix says so (current MCP level: ${cap.mcp}). Do not invent user-count ratings.

## Capability matrix

| Surface | Level |
|---|---|
| API | ${cap.api} |
| MCP | ${cap.mcp} |
| CLI | ${cap.cli} |
| Docs | ${cap.docs} |
| Auth | ${cap.auth} |
| Webhooks | ${cap.webhooks} |
| SDKs | ${cap.sdks.join(", ") || "none listed"} |

## Auth

${cap.auth}

## Pricing (public)

${p.pricing}

## Official site

${p.website}

## Twin Score

Human ${p.twin.human}. Agent ${p.twin.agent}. Catalog score date ${p.twin.updated}. Rubric: ${abs("agents", "/scorecard")}

## Alternatives

${p.alternatives.filter((slug) => getProduct(slug)).map((slug) => `- ${slug}`).join("\n")}
`);
}

export function notFoundMd(site: SiteId, path: string): string {
  return `${h(1, "Not found")}\n\nNo page exists at ${path} on ${ORG_NAME[site]}.\n\n${h(2, "Recover")}\n\n- [All products](/products)\n- [Home](/)\n- [Twin site](${siblingUrl(site)})\n\n${h(3, "Search")}\n\nTry a product slug such as /products/chatgpt.\n`;
}

export function goneMd(site: SiteId, slug: string): string {
  return `${h(1, "Gone")}\n\n${slug} is retired from this catalog (HTTP 410).\n\n${h(2, "Recover")}\n\n- [All products](/products)\n- [Home](/)\n\n${h(3, "Why 410")}\n\nWe use 410 rather than 404 when an entity is deliberately unpublished.\n`;
}
