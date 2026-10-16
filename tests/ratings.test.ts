import { createRequire } from "node:module";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { catalog, getAuthor, type Review } from "../packages/db/src/catalog";
import { reviewJsonLd, softwareJsonLd } from "../packages/seo/src/jsonld";
import { llmsTxt } from "../packages/seo/src/llms";
import { pageMarkdown } from "../packages/seo/src/markdown";
import PeopleProduct from "../apps/people/app/products/[slug]/page";
import AgentsProduct from "../apps/agents/app/products/[slug]/page";
import ReviewPage from "../apps/people/app/reviews/[slug]/page";
import Home from "../apps/people/app/page";
import PeopleScorecard from "../apps/people/app/scorecard/page";
import AgentsScorecard, { metadata as agentScorecardMetadata } from "../apps/agents/app/scorecard/page";
import Methodology from "../apps/people/app/methodology/page";

// Keep actual JSON-LD, score and breadcrumb rendering, without loading the
// unrelated shared barrel's fonts and browser/WebGL components in Node.
vi.mock("@bs/ui", async () => ({
  ...await import("../packages/ui/src/json-ld"),
  ...await import("../packages/ui/src/twin-score"),
  ...await import("../packages/ui/src/breadcrumbs"),
}));
const appRequire = createRequire(new URL("../apps/people/package.json", import.meta.url));
const { renderToStaticMarkup } = appRequire("react-dom/server");
beforeAll(() => vi.stubGlobal("React", appRequire("react")));
afterAll(() => vi.unstubAllGlobals());

const product = catalog.products[0];
const reviewTemplate = catalog.reviews.find((r) => r.product === product.slug)!;
const originalReviews = catalog.reviews;
afterEach(() => { catalog.reviews = originalReviews; });
const params = (slug: string) => ({ params: Promise.resolve({ slug }) });

function reviewWithScores(human: unknown, agent: unknown): Review {
  return {
    ...reviewTemplate,
    slug: "rating-fixture",
    title: "Rating fixture review",
    body: "This review body is visible on its dedicated page.",
    scoreHuman: human,
    scoreAgent: agent,
  } as Review;
}

function schemaNodes(html: string): Record<string, unknown>[] {
  return [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)]
    .flatMap((match) => {
      const parsed = JSON.parse(match[1]);
      return Array.isArray(parsed) ? parsed : [parsed];
    });
}

function visibleText(html: string): string {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

describe.each(["people", "agents"] as const)("honest %s review schema", (site) => {
  it("does not interpret product Twin Scores or editorial row counts as AggregateRating", () => {
    const data = softwareJsonLd(site, product, [reviewTemplate, reviewTemplate]);
    expect(data).toMatchObject({ "@type": "SoftwareApplication", name: product.name, description: product.description });
    expect(data.offers).toMatchObject({ url: product.website, description: product.pricing });
    expect(data).not.toHaveProperty("aggregateRating");
    expect(JSON.stringify(data)).not.toContain('"@type":"AggregateRating"');
    expect(softwareJsonLd(site, product, [])).toEqual(data);
  });

  it.each([0, 37.5, 100])("preserves the review's own native score %s without conversion or product fallback", (value) => {
    const review = reviewWithScores(site === "people" ? value : 64, site === "agents" ? value : 73);
    const data = reviewJsonLd(site, product, review, getAuthor(review.author));
    expect(data.reviewRating).toEqual({ "@type": "Rating", ratingValue: value, bestRating: 100, worstRating: 0 });
    expect(data.reviewBody).toBe(review.body);
    expect(data.name).toBe(review.title);
  });

  it.each([undefined, null, NaN, Infinity, -Infinity, -1, 101, "85"])("omits unusable audience score %s even when the other audience and product are scored", (value) => {
    const review = reviewWithScores(site === "people" ? value : 64, site === "agents" ? value : 73);
    expect(reviewJsonLd(site, product, review, undefined)).not.toHaveProperty("reviewRating");
  });

  it("keeps an unscored documentary public quote unscored", () => {
    const quote = catalog.reviews.find((r) => r.slug === "stripe-public-quote")!;
    const parent = catalog.products.find((p) => p.slug === quote.product)!;
    expect(reviewJsonLd(site, parent, quote, getAuthor(quote.author))).not.toHaveProperty("reviewRating");
  });
});

describe("visible review content and JSON-LD", () => {
  it.each([0, 41.5, 100])("displays the exact human score %s alongside the review body and matching schema", async (score) => {
    const review = reviewWithScores(score, 73);
    catalog.reviews = [review];
    const html = renderToStaticMarkup(await ReviewPage(params(review.slug)));
    const text = visibleText(html);
    expect(text).toContain(review.body);
    expect(text).toContain(`Human review score: ${score}/100`);
    const node = schemaNodes(html).find((node) => node["@type"] === "Review");
    expect(node).toMatchObject({ reviewBody: review.body, reviewRating: { ratingValue: score, bestRating: 100, worstRating: 0 } });
  });

  it.each([undefined, null, NaN, Infinity, -1, 101])("labels an unusable human score %s as unscored without publishing an invented rating", async (score) => {
    const review = reviewWithScores(score, 73);
    catalog.reviews = [review];
    const html = renderToStaticMarkup(await ReviewPage(params(review.slug)));
    expect(visibleText(html)).toContain("Unscored review");
    expect(visibleText(html)).toContain(review.body);
    expect(schemaNodes(html).find((node) => node["@type"] === "Review")).not.toHaveProperty("reviewRating");
  });

  it.each([["people", PeopleProduct], ["agents", AgentsProduct]] as const)("keeps the %s product page free of full Review schema and composite aggregates", async (site, Page) => {
    const review = reviewWithScores(41, 73);
    catalog.reviews = [review];
    const html = renderToStaticMarkup(await Page(params(product.slug)));
    const nodes = schemaNodes(html);
    expect(nodes.some((node) => node["@type"] === "SoftwareApplication")).toBe(true);
    expect(nodes.some((node) => node["@type"] === "Review")).toBe(false);
    expect(nodes.find((node) => node["@type"] === "SoftwareApplication")).not.toHaveProperty("aggregateRating");
    if (site === "people") {
      expect(html).toContain(`/reviews/${review.slug}`);
      expect(visibleText(html)).toContain(review.title);
      expect(visibleText(html)).not.toContain(review.body);
    }
  });
});

describe("current schema explanation", () => {
  it.each(["people", "agents"] as const)("corrects %s home Markdown, scorecard Markdown and llms.txt", (site) => {
    for (const text of [pageMarkdown(site, "/").body, pageMarkdown(site, "/scorecard").body, llmsTxt(site)]) {
      expect(text).toContain("do not emit AggregateRating");
      expect(text).not.toMatch(/AggregateRating[^.]*\b(?:only those|emitted only|staff scores scaled)/);
    }
  });

  it.each([["home", Home], ["people scorecard", PeopleScorecard], ["agents scorecard", AgentsScorecard], ["methodology", Methodology]] as const)("corrects the visible %s schema explanation", (_label, Page) => {
    expect(visibleText(renderToStaticMarkup(Page()))).toContain("do not emit AggregateRating");
  });

  it("corrects agents scorecard metadata", () => {
    expect(agentScorecardMetadata.description).toContain("do not emit AggregateRating");
  });

  it("corrects the shared rubric note without changing its first sentence", () => {
    expect(catalog.rubric.notes).toMatch(/^Scores are editorial 0-100 composites, not star averages and not user-count ratings\./);
    expect(catalog.rubric.notes).toContain("do not emit AggregateRating");
  });

  it("corrects only the article's schema paragraph claim", () => {
    const article = catalog.articles.find((a) => a.slug === "fake-ugc-editorial-policy")!;
    const paragraph = article.body.split("## Schema without lying\n\n")[1].split("\n\n")[0];
    expect(paragraph).toContain("do not emit AggregateRating");
    expect(paragraph).toContain("0–100");
    expect(paragraph).not.toContain("5-point scale");
  });
});
