import { createRequire } from "node:module";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { catalog, getAuthor, getProduct, getReview, productsInCategory, type Review } from "../packages/db/src/catalog";
import { abs, curatedComparisonPath } from "../packages/seo/src";
import { pageMarkdown } from "../packages/seo/src/markdown";
import Home, { metadata as homeMetadata } from "../apps/people/app/page";
import About, { metadata as aboutMetadata } from "../apps/people/app/about/page";
import Methodology, { metadata as methodMetadata } from "../apps/people/app/methodology/page";
import Policy, { metadata as policyMetadata } from "../apps/people/app/editorial-policy/page";
import Scorecard, { metadata as scoreMetadata } from "../apps/people/app/scorecard/page";
import Api, { metadata as apiMetadata } from "../apps/people/app/api/page";
import ForAgents, { metadata as agentsMetadata } from "../apps/people/app/for-agents/page";
import Author, { generateMetadata as authorMetadata } from "../apps/people/app/authors/[slug]/page";
import ReviewPage, { generateMetadata as reviewMetadata } from "../apps/people/app/reviews/[slug]/page";
import Product, { generateMetadata as productMetadata } from "../apps/people/app/products/[slug]/page";
import Best, { generateMetadata as bestMetadata } from "../apps/people/app/best/[slug]/page";

vi.mock("@bs/ui", async () => ({
  ...await import("../packages/ui/src/json-ld"),
  ...await import("../packages/ui/src/twin-score"),
  ...await import("../packages/ui/src/breadcrumbs"),
}));
const appRequire = createRequire(new URL("../apps/people/package.json", import.meta.url));
const { renderToStaticMarkup } = appRequire("react-dom/server");
beforeAll(() => vi.stubGlobal("React", appRequire("react")));
afterAll(() => vi.unstubAllGlobals());
const reviews = catalog.reviews;
afterEach(() => { catalog.reviews = reviews; });
const params = (slug: string) => ({ params: Promise.resolve({ slug }) });
const visible = (html: string) => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const schemas = (html: string): Record<string, unknown>[] => [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].flatMap((match) => {
  const parsed = JSON.parse(match[1]);
  return Array.isArray(parsed) ? parsed : [parsed];
});
function limits(text: string) {
  expect(text).toMatch(/legacy editorial estimates/i);
  expect(text).toMatch(/no firsthand (?:product-)?test (?:log|record)/i);
}

describe("People public editorial disclosure", () => {
  it.each([
    ["/", Home], ["/about", About], ["/methodology", Methodology], ["/editorial-policy", Policy],
    ["/scorecard", Scorecard], ["/api", Api], ["/for-agents", ForAgents],
  ] as const)("renders truthful legacy/documentary limitations at %s and agrees with available Markdown", (path, Page) => {
    const html = renderToStaticMarkup(Page());
    limits(visible(html));
    const md = pageMarkdown("people", path);
    expect(md.status).toBe(200);
    // Editorial-policy Markdown remains AEO01's generic fallback, not an E01-P shared-file edit.
    if (path !== "/editorial-policy") limits(md.body);
    expect(visible(html)).not.toMatch(/assigned by named staff using public products|We use public apps and public docs|Named humans remain accountable/);
  });

  it("separates pending submissions from public publication and limits the permission claim", () => {
    const policy = visible(renderToStaticMarkup(Policy()));
    expect(policy).toContain("approving a database row does not publish it here");
    expect(policy).toContain("No automated submission-to-publication workflow is enabled");
    expect(policy).toContain("public form does not offer an admin-role field");
    expect(policy).toContain("permission enforcement has not been verified");
    const methodology = visible(renderToStaticMarkup(Methodology()));
    expect(methodology).toContain("submissions are separate and do not publish automatically");
    expect(methodology).toContain("do not contain the original scoring observations");
  });

  it.each(catalog.authors.map((author) => author.slug))("keeps %s attribution, evidence status, metadata and Person data in agreement", async (slug) => {
    const author = getAuthor(slug)!;
    const html = renderToStaticMarkup(await Author(params(slug)));
    const text = visible(html);
    expect(text).toContain("Attribution and evidence status");
    expect(text).toContain(author.bio);
    expect(text).toContain(author.credentials);
    const person = schemas(html).find((node) => node["@type"] === "Person")!;
    expect(person).toMatchObject({ name: author.name, description: author.bio, jobTitle: author.role, url: abs("people", `/authors/${slug}`) });
    expect(person).not.toHaveProperty("hasCredential");
    expect((await authorMetadata(params(slug))).alternates?.canonical).toBe(abs("people", `/authors/${slug}`));
  });

  it.each([0, 37.5, 100])("shows native own review score %s and its limitation without a product-score fallback", async (score) => {
    const template = reviews.find((review) => review.slug === "chatgpt-editorial-human")!;
    const fixture: Review = { ...template, slug: "people-score-fixture", body: "Editorial fixture body.", scoreHuman: score, scoreAgent: 76 };
    catalog.reviews = [fixture];
    const html = renderToStaticMarkup(await ReviewPage(params(fixture.slug)));
    const text = visible(html);
    limits(text);
    expect(text).toContain(`Human review score: ${score}/100`);
    expect(schemas(html).find((node) => node["@type"] === "Review")).toMatchObject({ reviewBody: fixture.body, reviewRating: { ratingValue: score, bestRating: 100, worstRating: 0 } });
    expect((await reviewMetadata(params(fixture.slug))).alternates?.canonical).toBe(abs("people", `/reviews/${fixture.slug}`));
  });

  it.each(["stripe-public-quote", "github-public-quote", "n8n-public-quote"])("renders %s as a sourced unscored paraphrase without changing byline/kind", async (slug) => {
    const row = getReview(slug)!;
    const html = renderToStaticMarkup(await ReviewPage(params(slug)));
    expect(visible(html)).toContain("Public documentation note (editorial paraphrase)");
    expect(visible(html)).toContain("Unscored review");
    expect(visible(html)).toContain("Kind is public_quote");
    expect(html).toContain(`href="${row.sourceUrl}"`);
    expect(html).toContain(`href="/authors/${row.author}"`);
    expect(schemas(html).find((node) => node["@type"] === "Review")).not.toHaveProperty("reviewRating");
    expect(visible(html)).not.toContain("Human review score:");
  });

  it("preserves product scores, dates, canonical metadata and curated alternative links with honest byline labels", async () => {
    const product = getProduct("chatgpt")!;
    const html = renderToStaticMarkup(await Product(params(product.slug)));
    const text = visible(html);
    limits(text);
    expect(text).toContain("Catalog editor attribution:");
    expect(text).toContain(`Catalog score date ${product.twin.updated}`);
    expect(text).toMatch(new RegExp(`Human ${product.twin.human} Agent ${product.twin.agent}`));
    expect(html).toContain(`href="${abs("agents", `/products/${product.slug}`)}"`);
    expect((await productMetadata(params(product.slug))).alternates?.canonical).toBe(abs("people", `/products/${product.slug}`));
    for (const other of product.alternatives) {
      const path = curatedComparisonPath(product.slug, other);
      if (path) expect(html).toContain(`href="${path}"`);
      else expect(html).not.toContain(`href="/compare/${product.slug}-vs-${other}"`);
    }
    expect(schemas(html).find((node) => node["@type"] === "SoftwareApplication")).not.toHaveProperty("aggregateRating");
  });

  it("discloses the raw-number best list and preserves the existing ranking/schema/order", async () => {
    const category = "ai-assistants";
    const expected = productsInCategory(category).slice().sort((a, b) => b.twin.human - a.twin.human);
    const html = renderToStaticMarkup(await Best(params(category)));
    limits(visible(html));
    const list = html.match(/<ol>(.*?)<\/ol>/s)![1];
    const slugs = [...list.matchAll(/href="\/products\/([^"/]+)"/g)].map((match) => match[1]);
    expect(slugs).toEqual(expected.map((product) => product.slug));
    for (const product of expected) expect(visible(list)).toContain(`${product.twin.human} human / ${product.twin.agent} agent`);
    const node = schemas(html).find((node) => node["@type"] === "ItemList")!;
    expect((node.itemListElement as { url: string }[]).map((item) => item.url)).toEqual(expected.map((product) => abs("people", `/products/${product.slug}`)));
    expect((await bestMetadata(params(category))).alternates?.canonical).toBe(abs("people", `/best/${category}`));
  });

  it("retains static canonical metadata and machine-readable resource links", () => {
    for (const [path, metadata] of [["/", homeMetadata], ["/about", aboutMetadata], ["/methodology", methodMetadata], ["/editorial-policy", policyMetadata], ["/scorecard", scoreMetadata], ["/api", apiMetadata], ["/for-agents", agentsMetadata]] as const) {
      expect(metadata.alternates?.canonical).toBe(abs("people", path));
    }
    const api = renderToStaticMarkup(Api());
    for (const path of ["/api/v1", "/api/v1/products", "/api/v1/reviews?product=chatgpt", "/openapi.json", "/.well-known/api-catalog"]) expect(api).toContain(`href="${path}"`);
    expect(visible(api)).toContain("No key required for read");
    expect(renderToStaticMarkup(Scorecard())).toContain(`href="${abs("agents", "/dataset/twin-scores.json")}"`);
  });
});
