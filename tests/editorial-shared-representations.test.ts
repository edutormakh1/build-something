import { createRequire } from "node:module";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { catalog, getAuthor, getProduct, getReview } from "../packages/db/src/catalog";
import { TwinScore } from "../packages/ui/src/twin-score";
import { JsonLd } from "../packages/ui/src/json-ld";
import { ProductCard as PeopleCard } from "../apps/people/components/product-card";
import { ProductCard as AgentsCard } from "../apps/agents/components/product-card";
import { pageMarkdown, skillMd } from "../packages/seo/src/markdown";
import { datasetJsonLd, reviewJsonLd, softwareJsonLd } from "../packages/seo/src/jsonld";

vi.mock("@bs/ui", async () => ({ ...await import("../packages/ui/src/twin-score") }));
const requireApp = createRequire(new URL("../apps/people/package.json", import.meta.url));
const React = requireApp("react");
const { renderToStaticMarkup } = requireApp("react-dom/server");
beforeAll(() => vi.stubGlobal("React", React));
afterAll(() => vi.unstubAllGlobals());
const visible = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const product = getProduct("chatgpt")!;
function expectLimits(text: string) {
  expect(text).toMatch(/legacy editorial estimates/i);
  expect(text).toMatch(/no firsthand (?:product-)?test (?:record|log)/i);
}

describe("shared rendered score provenance", () => {
  it.each([undefined, "2026-08-01"])("shows a real visible limitation with score date %s and preserves zero/value/aria", (updated) => {
    const html = renderToStaticMarkup(React.createElement(TwinScore, { human: 0, agent: 94, updated, emphasize: "agent" }));
    expectLimits(visible(html));
    expect(html).toContain('aria-label="Twin Score human 0 agent 94"');
    expect(visible(html)).toMatch(/Human 0 Agent 94/);
    if (updated) expect(visible(html)).toContain(`Catalog score date ${updated}`);
    else expect(visible(html)).not.toContain("Catalog score date");
  });

  it.each([["people", PeopleCard], ["agents", AgentsCard]] as const)("discloses legacy estimates in the actual undated %s product card", (_site, Card) => {
    const html = renderToStaticMarkup(React.createElement(Card, { product }));
    expectLimits(visible(html));
    expect(html).toContain(`href="/products/${product.slug}"`);
    expect(visible(html)).toContain(product.name);
    expect(visible(html)).toMatch(new RegExp(`Human ${product.twin.human} Agent ${product.twin.agent}`));
  });

  const routes = [
    ["people", "/"], ["agents", "/"], ["people", "/products"], ["agents", "/products"],
    ["people", "/products/chatgpt"], ["agents", "/products/chatgpt"],
    ["people", "/best/ai-assistants"], ["people", "/alternatives/chatgpt"],
    ["people", "/compare/chatgpt-vs-claude"], ["people", "/reviews/chatgpt-editorial-agent"],
    ["people", "/methodology"], ["agents", "/methodology"], ["people", "/scorecard"], ["agents", "/scorecard"],
    ["people", "/api"], ["agents", "/api"], ["people", "/for-agents"], ["agents", "/for-agents"],
  ] as const;
  it.each(routes)("carries actual limitations through %s %s Markdown without changing success status", (site, path) => {
    const result = pageMarkdown(site, path);
    expect(result.status).toBe(200);
    expectLimits(result.body);
    expect(result.body).not.toMatch(/assigned by named staff|using public apps and public docs|until Supabase secrets land/);
  });

  it("preserves published facts and separate skill representations without converting the score date into an audit date", () => {
    const md = pageMarkdown("agents", "/products/chatgpt").body;
    const skill = skillMd(product.slug);
    expectLimits(skill);
    expect(pageMarkdown("agents", `/skills/${product.slug}`).body).toBe(skill);
    expect(skill).toContain(`Human ${product.twin.human}. Agent ${product.twin.agent}. Catalog score date ${product.twin.updated}`);
    expect(md).toContain(`Human ${product.twin.human}. Agent ${product.twin.agent}. Catalog score date ${product.twin.updated}`);
    expect(skill).toContain(product.capabilities.auth);
    expect(skill).toContain(product.website);
    expect(skill).toContain("not validate the scores");
  });

  it.each(["stripe-public-quote", "github-public-quote", "n8n-public-quote"])("labels %s as an unscored paraphrase while keeping its source and kind", (slug) => {
    const review = getReview(slug)!;
    const text = pageMarkdown("people", `/reviews/${slug}`).body;
    expect(text).toContain("Public documentation note (editorial paraphrase)");
    expect(text).toMatch(/unscored/i);
    expect(text).toContain("Kind: public_quote");
    expect(text).toContain(review.sourceUrl);
    expect(text).toContain("Human n/a; agent n/a");
    const data = reviewJsonLd("people", getProduct(review.product)!, review, getAuthor(review.author));
    const parsed = JSON.parse(renderToStaticMarkup(React.createElement(JsonLd, { data })).match(/<script[^>]*>(.*?)<\/script>/s)![1]);
    expect(parsed).not.toHaveProperty("reviewRating");
  });

  it("keeps native own-audience review scores including zero in parsed JSON-LD and does not emit aggregates", () => {
    const template = getReview("chatgpt-editorial-human")!;
    for (const site of ["people", "agents"] as const) {
      const review = { ...template, scoreHuman: site === "people" ? 0 : 44, scoreAgent: site === "agents" ? 0 : 55 };
      const data = reviewJsonLd(site, product, review, getAuthor(review.author));
      const parsed = JSON.parse(renderToStaticMarkup(React.createElement(JsonLd, { data })).match(/<script[^>]*>(.*?)<\/script>/s)![1]);
      expect(parsed.reviewRating).toEqual({ "@type": "Rating", ratingValue: 0, bestRating: 100, worstRating: 0 });
      expect(softwareJsonLd(site, product, [review])).not.toHaveProperty("aggregateRating");
    }
    const dataset = datasetJsonLd();
    expect(dataset.description).toMatch(/legacy editorial.*estimates/i);
    expect(dataset.description).toContain("documentation checks do not validate these scores");
    expect(dataset.distribution).toHaveLength(2);
    expect(dataset.license).toContain("creativecommons.org/licenses/by/4.0");
    expect(catalog.rubric.notes).toContain("do not emit AggregateRating");
  });
});
