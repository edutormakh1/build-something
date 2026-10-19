import { createRequire } from "node:module";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { allProducts, catalog, getAuthor, getProduct, getReview, type Product, type Review } from "../packages/db/src/catalog";
import { abs, allCanonical, reviewJsonLd } from "../packages/seo/src";
import { pageMarkdown, skillMd } from "../packages/seo/src/markdown";
import Policy, { metadata as policyMetadata } from "../apps/people/app/editorial-policy/page";
import Contact, { metadata as contactMetadata } from "../apps/people/app/contact/page";
import Blog, { metadata as blogMetadata } from "../apps/people/app/blog/page";
import Article, { generateMetadata as articleMetadata } from "../apps/people/app/blog/[slug]/page";
import ReviewPage, { generateMetadata as reviewMetadata } from "../apps/people/app/reviews/[slug]/page";
import PeopleProduct from "../apps/people/app/products/[slug]/page";
import PeopleProducts, { metadata as peopleProductsMetadata } from "../apps/people/app/products/page";
import AgentsProducts, { metadata as agentsProductsMetadata } from "../apps/agents/app/products/page";
import Skill from "../apps/agents/app/skills/[slug]/page";
import Submit from "../apps/people/app/submit/page";
import { GET as rawSkill } from "../apps/agents/app/skills/[slug]/raw/route";
import { GET as datasetJson } from "../apps/agents/app/dataset/twin-scores.json/route";
import { GET as datasetCsv } from "../apps/agents/app/dataset/twin-scores.csv/route";
import { GET as skillIndex } from "../apps/agents/app/.well-known/agent-skills/index.json/route";
import { GET as peopleApi } from "../apps/people/app/api/v1/route";
import { GET as peopleApiProducts } from "../apps/people/app/api/v1/products/route";
import { GET as peopleApiProduct } from "../apps/people/app/api/v1/products/[slug]/route";
import { GET as peopleApiReviews } from "../apps/people/app/api/v1/reviews/route";
import { GET as peopleApiCatalog } from "../apps/people/app/.well-known/api-catalog/route";
import { GET as agentsApiCatalog } from "../apps/agents/app/.well-known/api-catalog/route";
import { GET as peopleOpenApi } from "../apps/people/app/openapi.json/route";
import { GET as agentsOpenApi } from "../apps/agents/app/openapi.json/route";
import { GET as peopleLlms } from "../apps/people/app/llms.txt/route";
import { GET as agentsLlms } from "../apps/agents/app/llms.txt/route";
import { GET as peopleLlmsFull } from "../apps/people/app/llms-full.txt/route";
import { GET as agentsLlmsFull } from "../apps/agents/app/llms-full.txt/route";
import { GET as peopleMarkdown } from "../apps/people/app/md/[[...path]]/route";
import { GET as agentsMarkdown } from "../apps/agents/app/md/[[...path]]/route";

vi.mock("@bs/ui", async () => ({
  ...await import("../packages/ui/src/json-ld"),
  ...await import("../packages/ui/src/twin-score"),
  ...await import("../packages/ui/src/breadcrumbs"),
}));
const auth = vi.hoisted(() => ({ user: vi.fn(), profile: vi.fn(), server: vi.fn() }));
vi.mock("@bs/auth/server", () => ({ hasRealSupabase: () => true, createServerSupabase: auth.server }));
vi.mock("../apps/people/components/auth-forms", () => ({ BusinessProfileForm: () => null }));
const appRequire = createRequire(new URL("../apps/people/package.json", import.meta.url));
const { renderToStaticMarkup, renderToString } = appRequire("react-dom/server");
const forbiddenFetch = vi.fn(() => { throw new Error("AEO consumer tests prohibit network"); });
beforeAll(() => { vi.stubGlobal("React", appRequire("react")); vi.stubGlobal("fetch", forbiddenFetch); });
afterAll(() => { expect(forbiddenFetch).not.toHaveBeenCalled(); vi.unstubAllGlobals(); });
const original = { products: catalog.products, reviews: catalog.reviews, comparePairs: catalog.comparePairs };
afterEach(() => {
  try { expect(forbiddenFetch).not.toHaveBeenCalled(); }
  finally { Object.assign(catalog, original); vi.unstubAllEnvs(); vi.clearAllMocks(); }
});
const params = (slug: string) => ({ params: Promise.resolve({ slug }) });
const decode = (s: string) => s.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const plain = (s: string) => decode(s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const paragraphs = (html: string) => [...html.matchAll(/<p(?:\s[^>]*)?>(.*?)<\/p>/gs)].map(m => plain(m[1]));
const headings = (html: string) => [...html.matchAll(/<(h[123])>(.*?)<\/\1>/gs)].map(m => [m[1], plain(m[2])]);
const schemas = (html: string): Record<string, unknown>[] => [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].flatMap(m => { const value = JSON.parse(m[1]); return Array.isArray(value) ? value : [value]; });
const links = (md: string) => [...md.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map(m => m[1]);
const md = (site: "people" | "agents", path: string) => { const result = pageMarkdown(site, path); expect(result.status).toBe(200); return result.body; };

// Independent accepted HTML facts, intentionally not imported from page-content.
const policyParagraphs = [
  "This directory is an editorial product. Reviews are labeled by kind: editorial, public_quote (editorial documentation paraphrases with source URL, not direct quotations or user testimony), user, or agent. Submissions are stored separately as pending when the submission service is configured. Public reviews are read from the committed catalog; approving a database row does not publish it here. No automated submission-to-publication workflow is enabled in this version. We never show fake UGC as authentic.",
  "We do not sell stars. If a vendor later becomes a sponsor, the relationship will be labeled on the page. The public form does not offer an admin-role field. Database-side permission enforcement has not been verified by this editorial audit. Corrections go to editor@buildsomethingpeoplewant.com.",
  "The bylines are catalog attributions; this evidence register contains agent documentation review dated 2026-10-16, with a responsible human editor unassigned. Professional history and firsthand product evaluations are not independently verified in this evidence register. Twin Scores are legacy editorial estimates on a 0–100 scale. No firsthand product-test log or per-dimension scoring worksheet is attached to these retained scores. Dated documentation checks establish only the specific product facts they cite; they do not validate the scores. The tables summarize committed catalog values, not firsthand measurements.",
];
const contactParagraphs = [
  "Email editor@buildsomethingpeoplewant.com for corrections, product submissions after you create an account, and press. This is a worldwide English publication; we do not run a walk-in newsroom.",
  "Product slug if it exists, URLs to public docs, and the factual error. We do not accept ghostwritten five-star quotes.",
];

describe("useful public static representations", () => {
  it.each(["people", "agents"] as const)("covers every current %s canonical static page, so a future generic fallback is not silently accepted", site => {
    const expected = site === "people"
      ? ["/", "/products", "/blog", "/editorial-policy", "/contact", "/submit", "/methodology", "/scorecard", "/about", "/for-agents", "/api"]
      : ["/", "/products", "/methodology", "/scorecard", "/about", "/for-agents", "/api"];
    expect(allCanonical(site).filter(entry => entry.path === "/" || /^\/[^/]+$/.test(entry.path)).map(entry => entry.path).sort()).toEqual(expected.sort());
  });

  it("retains complete policy paragraphs, heading order, metadata and breadcrumb while exposing them in Markdown", () => {
    const html = renderToStaticMarkup(Policy());
    expect(paragraphs(html)).toEqual(policyParagraphs);
    expect(headings(html)).toEqual([["h1", "Editorial policy"], ["h2", "Independence"], ["h3", "AI assistance"]]);
    const body = md("people", "/editorial-policy");
    expect(body).toBe(`# Editorial policy\n\n${policyParagraphs[0]}\n\n## Independence\n\n${policyParagraphs[1]}\n\n### AI assistance\n\n${policyParagraphs[2]}\n`);
    const description = "Conflicts, review kinds, UGC rules, and how corrections work at Build Something People Want.";
    expect(policyMetadata).toEqual({ title: "Editorial policy", description, alternates: { canonical: abs("people", "/editorial-policy") }, openGraph: { title: "Editorial policy", description }, twitter: { card: "summary_large_image", title: "Editorial policy", description } });
    expect(schemas(html)[0]).toMatchObject({ "@type": "BreadcrumbList", itemListElement: [{ position: 1, name: "Home", item: abs("people", "/") }, { position: 2, name: "Editorial policy", item: abs("people", "/editorial-policy") }] });
  });

  it("retains complete contact paragraphs, URL text-child boundaries and independent Markdown title", () => {
    const last = `Machines should prefer ${abs("agents", "/for-agents")} and the API. Humans can use this form of words and the email address above.`;
    const html = renderToStaticMarkup(Contact());
    expect(paragraphs(html)).toEqual([...contactParagraphs, last]);
    expect(headings(html)).toEqual([["h1", "Contact the editors"], ["h2", "What to include"], ["h3", "Agents"]]);
    expect(renderToString(Contact())).toContain(`<p>Machines should prefer <!-- -->${abs("agents", "/for-agents")}<!-- --> and the API. Humans can use this form of words and the email address above.</p>`);
    const body = md("people", "/contact");
    expect(body).toBe(`# Contact\n\n${contactParagraphs[0]}\n\n## What to include\n\n${contactParagraphs[1]}\n\n### Agents\n\n${last}\n`);
    const description = "Contact the editors of Build Something People Want.";
    expect(contactMetadata).toEqual({ title: "Contact", description, alternates: { canonical: abs("people", "/contact") }, openGraph: { title: "Contact", description }, twitter: { card: "summary_large_image", title: "Contact", description } });
    expect(schemas(html)[0]).toMatchObject({ "@type": "BreadcrumbList", itemListElement: [{ name: "Home" }, { name: "Contact", item: abs("people", "/contact") }] });
  });

  it("uses the committed E01F journal facts, full records and actual People article destinations in catalog order", async () => {
    const body = md("people", "/blog");
    const html = renderToStaticMarkup(Blog());
    expect(body.startsWith("# Blog\n\nEditorial essays and analysis of retained Twin Score estimates. Bylines are catalog attributions; firsthand product testing is not documented.\n")).toBe(true);
    expect(blogMetadata.description).toBe("Editorial essays and analysis of retained Twin Score estimates from Build Something People Want. Bylines are catalog attributions; firsthand product testing is not documented.");
    expect(body).toContain("Bylines are catalog attributions; firsthand product testing is not documented.");
    expect(catalog.articles).toHaveLength(7);
    expect(catalog.articles[0].title).toBe("Human vs agent software surfaces in 2026: retained Twin Score estimates");
    expect(links(body)).toEqual(catalog.articles.map(a => `/blog/${a.slug}`));
    const list = schemas(html).find(n => n["@type"] === "ItemList")!;
    expect(list.itemListElement).toEqual(catalog.articles.map((a, i) => ({ "@type": "ListItem", position: i + 1, name: a.title, url: abs("people", `/blog/${a.slug}`) })));
    for (const a of catalog.articles) {
      expect(body).toContain(`[${a.title}](/blog/${a.slug}) — ${getAuthor(a.author)!.name} · ${a.publishedAt}\n\n${a.description}`);
      expect(plain(html)).toContain(a.description);
      const article = renderToStaticMarkup(await Article(params(a.slug)));
      expect(plain(article)).toContain(a.title);
      expect(await articleMetadata(params(a.slug))).toMatchObject({ title: a.title, description: a.description, alternates: { canonical: abs("people", `/blog/${a.slug}`) } });
    }
  });

  it("provides session-free submission steps without reading or exposing a mocked private profile", async () => {
    auth.user.mockResolvedValue({ data: { user: { id: "PRIVATE-AEO-USER" } } });
    auth.profile.mockResolvedValue({ data: { company_name: "PRIVATE-AEO-COMPANY", what_they_ship: "PRIVATE-AEO-PITCH".repeat(40) } });
    auth.server.mockResolvedValue({ auth: { getUser: auth.user }, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: auth.profile }) }) }) });
    const body = md("people", "/submit");
    expect(body).toContain("Create an account, then complete the business profile if you want to request a listing. The listing pitch requires at least 400 characters. Listings remain editorial decisions. Use the HTML submission page for your current account state and form.");
    expect(body).toContain("Submissions are stored separately as pending when the submission service is configured. Public reviews are read from the committed catalog; approving a database row does not publish it here. No automated submission-to-publication workflow is enabled in this version.");
    expect(links(body)).toEqual(expect.arrayContaining(["/signup", "/login", "/submit", "/editorial-policy"]));
    expect(auth.server).not.toHaveBeenCalled();
    expect(body).not.toMatch(/PRIVATE-AEO|Your membership card is on file|signed in|submitted successfully/i);
    expect(plain(renderToStaticMarkup(await Submit()))).toContain("Your membership card is on file");
    expect(auth.profile).toHaveBeenCalledOnce();
  });

  it.each([
    ["people", "/", "Featured products"], ["people", "/products", "Published entities"], ["people", "/blog", "firsthand product testing is not documented"],
    ["people", "/editorial-policy", "permission enforcement has not been verified"], ["people", "/contact", "URLs to public docs"], ["people", "/submit", "400 characters"],
    ["people", "/methodology", "submission-to-publication"], ["people", "/scorecard", "Human dimensions"], ["people", "/about", "What we are not"], ["people", "/for-agents", "When not to use"], ["people", "/api", "application/problem+json"],
    ["agents", "/", "Featured products"], ["agents", "/products", "Published entities"], ["agents", "/methodology", "submission-to-publication"], ["agents", "/scorecard", "Human dimensions"], ["agents", "/about", "What we are not"], ["agents", "/for-agents", "When not to use"], ["agents", "/api", "application/problem+json"],
  ] as const)("renders useful explicit %s %s content", (site, path, fact) => {
    expect(allCanonical(site).some(e => e.path === path)).toBe(true);
    expect(md(site, path)).toContain(fact);
  });
});

describe("published review and resource destinations", () => {
  it("links only visible reviews to the actual People renderer, keeps People relative and Agents reviews absent", async () => {
    const template = original.products[0];
    const product = (slug: string, status: Product["status"] = "published") => ({ ...template, slug, status });
    const review = (slug: string, parent = "aeo-public", status: Review["status"] = "published") => ({ ...original.reviews[0], slug, product: parent, status, title: `AEO ${slug}` });
    catalog.products = [product("aeo-public"), product("aeo-draft", "draft"), product("aeo-hidden", "hidden")];
    catalog.reviews = [review("visible"), review("pending", undefined, "pending"), review("draft", undefined, "draft"), review("hidden", undefined, "hidden"), review("draft-parent", "aeo-draft"), review("hidden-parent", "aeo-hidden"), review("orphan", "aeo-missing")];
    vi.stubEnv("NEXT_PUBLIC_PEOPLE_SITE_URL", "http://localhost:4310/");
    vi.stubEnv("NEXT_PUBLIC_AGENTS_SITE_URL", "https://aeo-agents.example/");
    const agents = md("agents", "/products/aeo-public");
    const people = md("people", "/products/aeo-public");
    const destinations = links(agents).filter(url => new URL(url, "https://aeo-agents.example").pathname.startsWith("/reviews/"));
    expect(destinations).toEqual(["http://localhost:4310/reviews/visible"]);
    expect(links(people)).toContain("/reviews/visible");
    for (const url of destinations) {
      const slug = new URL(url).pathname.split("/").at(-1)!;
      expect(getReview(slug)?.product).toBe("aeo-public");
      expect(plain(renderToStaticMarkup(await ReviewPage(params(slug))))).toContain("AEO visible");
      expect(await reviewMetadata(params(slug))).toMatchObject({ alternates: { canonical: url } });
      expect(pageMarkdown("agents", new URL(url).pathname).status).toBe(404);
    }
    for (const slug of ["pending", "draft", "hidden", "draft-parent", "hidden-parent", "orphan"]) {
      expect(agents).not.toContain(`AEO ${slug}`);
      expect(getReview(slug)).toBeUndefined();
    }
    expect(pageMarkdown("agents", "/products/aeo-draft").status).toBe(404);
    expect(pageMarkdown("agents", "/products/aeo-hidden").status).toBe(404);
  });

  it.each(["people", "agents"] as const)("exposes concrete existing %s resource links with the correct twin origin", async site => {
    const local = ["/api/v1", "/api/v1/products", "/api/v1/reviews?product=chatgpt", "/openapi.json", "/.well-known/api-catalog", "/llms.txt", "/llms-full.txt"];
    const agent = ["/.well-known/agent-skills/index.json", "/dataset/twin-scores.json", "/dataset/twin-scores.csv"];
    for (const path of ["/api", "/for-agents"]) {
      const body = md(site, path), destinations = links(body);
      for (const url of local) expect(destinations).toContain(abs(site, url));
      for (const url of agent) expect(destinations).toContain(abs("agents", url));
      expect(body).not.toContain("/mcp.json");
      expect(destinations.some(url => /\{slug\}/.test(url))).toBe(false);
    }
    const product = md(site, "/products/chatgpt");
    expect(links(product)).toEqual(expect.arrayContaining([abs("agents", "/skills/chatgpt"), abs("agents", "/skills/chatgpt/raw")]));
    expect(links(md(site, "/for-agents"))).toEqual(expect.arrayContaining([abs("people", "/blog"), abs("people", "/editorial-policy")]));
    const raw = await rawSkill(new Request("http://localhost/"), params("chatgpt"));
    expect(raw.status).toBe(200); expect(raw.headers.get("content-type")).toContain("text/markdown");
    expect(await raw.text()).toBe(skillMd("chatgpt"));
    expect(plain(renderToStaticMarkup(await Skill(params("chatgpt"))))).toContain("SKILL.md — ChatGPT");
    const index = await skillIndex().json();
    expect(index.skills.map((r: { name: string }) => r.name)).toEqual(allProducts().map(p => p.slug));
    expect(index.skills.find((r: { name: string }) => r.name === "chatgpt")).toMatchObject({ url: abs("agents", "/skills/chatgpt"), markdown: abs("agents", "/skills/chatgpt/raw") });
  });

  it("preserves real API, API-catalog, OpenAPI, llms and dataset payloads rather than inventing resources", async () => {
    expect(peopleApi().status).toBe(200);
    const products = await peopleApiProducts().json();
    expect(products.data.map((p: Product) => p.slug)).toEqual(allProducts().map(p => p.slug));
    const product = await peopleApiProduct(new Request("http://localhost/api/v1/products/chatgpt"), params("chatgpt"));
    expect(await product.json()).toMatchObject({ data: { slug: "chatgpt", twin: getProduct("chatgpt")!.twin } });
    const missing = await peopleApiProduct(new Request("http://localhost/api/v1/products/unknown-aeo"), params("unknown-aeo"));
    expect(missing.status).toBe(404); expect(await missing.json()).toMatchObject({ status: 404, code: "not_found" });
    expect(peopleApiReviews(new Request("http://localhost/api/v1/reviews?product=chatgpt")).status).toBe(200);
    for (const [site, cat, api, llms, full] of [["people", peopleApiCatalog, peopleOpenApi, peopleLlms, peopleLlmsFull], ["agents", agentsApiCatalog, agentsOpenApi, agentsLlms, agentsLlmsFull]] as const) {
      expect(cat().headers.get("content-type")).toContain("application/linkset+json");
      expect(await cat().text()).toContain(abs(site, "/openapi.json"));
      expect(await api().json()).toMatchObject({ openapi: "3.1.0" });
      for (const render of [llms, full]) {
        const body = await render().text();
        expect(body).toContain(abs("agents", "/dataset/twin-scores.json"));
        expect(body).toContain(abs("people", `/blog/${catalog.articles[0].slug}`));
      }
    }
    const dataset = await datasetJson().json();
    expect(Object.keys(dataset)).toEqual(["license", "generatedAt", "rubric", "products"]);
    expect(dataset).toMatchObject({ license: catalog.license, generatedAt: catalog.generatedAt, rubric: catalog.rubric });
    expect(dataset.products).toEqual(allProducts().map(p => ({ slug: p.slug, name: p.name, vendor: p.vendor, category: p.category, human: p.twin.human, agent: p.twin.agent, updated: p.twin.updated, api: p.capabilities.api, mcp: p.capabilities.mcp, cli: p.capabilities.cli })));
    const csv = await datasetCsv().text();
    expect(csv.split("\n")[0]).toBe("slug,name,vendor,category,human,agent,updated,api,mcp,cli");
    expect(csv.trim().split("\n")).toHaveLength(allProducts().length + 1);
    const chatgpt = getProduct("chatgpt")!;
    expect(csv).toContain(`chatgpt,ChatGPT,OpenAI,${chatgpt.category},${chatgpt.twin.human},${chatgpt.twin.agent},${chatgpt.twin.updated},`);
    expect(JSON.stringify(dataset)).not.toContain("responsibleHumanEditor");
  });
});

const scoreCases = [0, 37.5, 100, undefined, null, NaN, Infinity, -Infinity, -1, 101, "85", true] as const;
const valid = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100;
describe.each(["human", "agent"] as const)("native %s Markdown scores", audience => {
  it.each(scoreCases)("handles own review field %s independently of the other valid audience", async value => {
    const r = { ...original.reviews.find(r => r.slug === "chatgpt-editorial-human")!, slug: "aeo-score-review", scoreHuman: audience === "human" ? value : 61.25, scoreAgent: audience === "agent" ? value : 72.5 } as Review;
    catalog.reviews = [r];
    const body = md("people", `/reviews/${r.slug}`);
    expect(body).toContain(`Human ${audience === "human" ? valid(value) ? value : "n/a" : 61.25}; agent ${audience === "agent" ? valid(value) ? value : "n/a" : 72.5}.`);
    for (const site of ["people", "agents"] as const) {
      const own = site === "people" ? r.scoreHuman : r.scoreAgent;
      const schema = reviewJsonLd(site, getProduct(r.product)!, r, getAuthor(r.author));
      if (valid(own)) expect(schema.reviewRating).toMatchObject({ ratingValue: own, bestRating: 100, worstRating: 0 });
      else expect(schema).not.toHaveProperty("reviewRating");
    }
    const html = renderToStaticMarkup(await ReviewPage(params(r.slug)));
    expect(plain(html)).toContain(valid(r.scoreHuman) ? `Human review score: ${r.scoreHuman}/100` : "Unscored review");
  });

  it.each(scoreCases)("formats product field %s across every displayed family and skill frontmatter/raw/HTML", async value => {
    const a = { ...original.products[0], slug: "aeo-product", name: "AEO sentinel product", twin: { ...original.products[0].twin, human: audience === "human" ? value : 61.25, agent: audience === "agent" ? value : 72.5 }, alternatives: ["aeo-other"] } as Product;
    const b = { ...original.products[1], slug: "aeo-other", name: "AEO other product", category: a.category, twin: { ...original.products[1].twin, human: 41.25, agent: 52.5 }, alternatives: [a.slug] };
    catalog.products = [a, b]; catalog.reviews = [];
    catalog.comparePairs = [{ a: a.slug, b: b.slug, intro: "AEO curated pair" }];
    const human = audience === "human" ? valid(value) ? value : "n/a" : 61.25;
    const agent = audience === "agent" ? valid(value) ? value : "n/a" : 72.5;
    for (const site of ["people", "agents"] as const) {
      expect(md(site, "/")).toContain(`[${a.name}](/products/${a.slug}) — Twin Score human ${human}, agent ${agent}`);
      expect(md(site, "/products")).toContain(`[${a.name}](/products/${a.slug}) (${a.vendor}) human ${human} / agent ${agent}`);
      expect(md(site, `/products/${a.slug}`)).toContain(`Human ${human}. Agent ${agent}. Catalog score date ${a.twin.updated}.`);
    }
    expect(md("people", `/best/${a.category}`)).toContain(`[${a.name}](/products/${a.slug}) — human Twin Score ${human}`);
    expect(md("people", `/compare/${a.slug}-vs-${b.slug}`)).toContain(`| ${a.name} | ${human} | ${agent} |`);
    catalog.comparePairs = [{ a: b.slug, b: a.slug, intro: "AEO reverse curated orientation" }];
    expect(md("people", `/compare/${b.slug}-vs-${a.slug}`)).toContain(`| ${a.name} | ${human} | ${agent} |`);
    expect(md("people", `/alternatives/${b.slug}`)).toContain(`[${a.name}](/products/${a.slug}) — human ${human}, agent ${agent}`);
    const skill = skillMd(a.slug);
    expect(skill).toContain(`description: Operate ${a.name} as an agent using public APIs, CLIs, and docs. Twin Score agent ${agent}.`);
    expect(skill).toContain(`Human ${human}. Agent ${agent}. Catalog score date ${a.twin.updated}.`);
    expect(md("agents", `/skills/${a.slug}`)).toBe(skill);
    expect(await (await rawSkill(new Request("http://localhost/"), params(a.slug))).text()).toBe(skill);
    const html = renderToStaticMarkup(await Skill(params(a.slug)));
    expect(decode(html.match(/<pre[^>]*>(.*?)<\/pre>/s)![1])).toBe(skill);
  });
});

it.each(["stripe-public-quote", "github-public-quote", "n8n-public-quote"])("preserves %s as an own-audience unscored sourced paraphrase", slug => {
  const r = getReview(slug)!; const body = md("people", `/reviews/${slug}`);
  expect(body).toContain("Public documentation note (editorial paraphrase). Unscored documentation note.");
  expect(body).toContain(`Source: ${r.sourceUrl}`); expect(body).toContain("Human n/a; agent n/a.");
});

it("preserves valid current scores/dates and the People-only HTML search versus complete Markdown directory", async () => {
  for (const p of allProducts()) {
    const visible = plain(renderToStaticMarkup(await PeopleProduct(params(p.slug))));
    expect(visible).toContain(`Catalog score date ${p.twin.updated}`);
    expect(visible).toContain(`Human ${p.twin.human} Agent ${p.twin.agent}`);
    expect(md("people", `/products/${p.slug}`)).toContain(`Human ${p.twin.human}. Agent ${p.twin.agent}. Catalog score date ${p.twin.updated}.`);
  }
  for (const q of ["  ChAtGpT  ", "aeo-no-matches-928"] ) {
    const outer = PeopleProducts({ searchParams: Promise.resolve({ q }) });
    const inner = outer.type as (props: typeof outer.props) => Promise<unknown>;
    const html = renderToStaticMarkup(await inner(outer.props));
    expect(plain(html)).toContain(q.includes("ChAtGpT") ? "2 matches" : "0 matches");
    const index = schemas(html).find(node => node["@type"] === "ItemList")!;
    expect((index.itemListElement as { url: string }[]).map(item => item.url)).toEqual(q.includes("ChAtGpT") ? [abs("people", "/products/chatgpt"), abs("people", "/products/openai-platform")] : []);
    expect(plain(renderToStaticMarkup(AgentsProducts()))).toContain(`${allProducts().length} entities`);
    for (const [site, get] of [["people", peopleMarkdown], ["agents", agentsMarkdown]] as const) {
      const response = await get(new Request(`http://localhost/md/products?q=${encodeURIComponent(q)}`), { params: Promise.resolve({ path: ["products"] }) });
      expect(response.status).toBe(200); expect(response.headers.get("vary")).toBe("Accept");
      const body = await response.text(); expect(body).toBe(md(site, "/products"));
      expect(body).toContain("Filter on the HTML site; this markdown list is complete.");
      for (const product of allProducts()) expect(body).toContain(`/products/${product.slug}`);
    }
  }
  expect(peopleProductsMetadata.alternates?.canonical).toBe(abs("people", "/products"));
  expect(agentsProductsMetadata.alternates?.canonical).toBe(abs("agents", "/products"));
  for (const site of ["people", "agents"] as const) {
    expect(pageMarkdown(site, "/aeo-unknown").status).toBe(404);
    const retired = catalog.retiredSlugs[0];
    expect(pageMarkdown(site, `/products/${retired}`).status).toBe(410);
  }
});
