import { createRequire } from "node:module";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { catalog, type Product } from "../packages/db/src/catalog";
import { pageMarkdown, skillMd } from "../packages/seo/src/markdown";
import { llmsTxt } from "../packages/seo/src/llms";
import ComparePage, { generateMetadata as compareMetadata, generateStaticParams } from "../apps/people/app/compare/[pair]/page";
import ProductPage, { generateMetadata as productMetadata } from "../apps/people/app/products/[slug]/page";
import AlternativesPage, { generateMetadata as alternativesMetadata } from "../apps/people/app/alternatives/[slug]/page";
import { GET as peopleMarkdown } from "../apps/people/app/md/[[...path]]/route";
import { GET as agentsMarkdown } from "../apps/agents/app/md/[[...path]]/route";

vi.mock("@bs/ui", async () => ({
  ...await import("../packages/ui/src/json-ld"),
  ...await import("../packages/ui/src/twin-score"),
  ...await import("../packages/ui/src/breadcrumbs"),
}));
const appRequire = createRequire(new URL("../apps/people/package.json", import.meta.url));
const { renderToStaticMarkup } = appRequire("react-dom/server");
beforeAll(() => vi.stubGlobal("React", appRequire("react")));
afterAll(() => vi.unstubAllGlobals());

const originalProducts = catalog.products;
const originalPairs = catalog.comparePairs;
const people = "http://localhost:4310";
const agents = "https://agents-preview.example.workers.dev";
const pairParams = (pair: string) => ({ params: Promise.resolve({ pair }) });
const slugParams = (slug: string) => ({ params: Promise.resolve({ slug }) });
const notFound = { digest: "NEXT_HTTP_ERROR_FALLBACK;404" };
const redirectDigest = (path: string) => ({ digest: expect.stringMatching(new RegExp(`^NEXT_REDIRECT;[^;]+;${path};308;$`)) });

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_PEOPLE_SITE_URL", people + "/");
  vi.stubEnv("NEXT_PUBLIC_AGENTS_SITE_URL", agents + "/");
  const product = (slug: string, status: Product["status"] = "published"): Product => ({
    ...originalProducts[0], slug, status, name: `${slug} name`, longDescription: `${slug} visible definition`,
    alternatives: slug === "alpha" ? ["zeta", "beta", "hidden-product", "missing"] : [],
  });
  catalog.products = [product("zeta"), product("alpha"), product("beta"), product("hidden-product", "hidden"), product("draft-product", "draft"), product("gamma-vs-delta")];
  catalog.comparePairs = [
    { a: "zeta", b: "alpha", intro: "Stored curated introduction" },
    { a: "zeta", b: "zeta", intro: "Invalid self introduction" },
    { a: "zeta", b: "draft-product", intro: "Private draft introduction" },
    { a: "hidden-product", b: "alpha", intro: "Private hidden introduction" },
    { a: "missing", b: "alpha", intro: "Missing introduction" },
    { a: "gamma-vs-delta", b: "alpha", intro: "Ambiguous introduction" },
  ];
});
afterEach(() => {
  catalog.products = originalProducts;
  catalog.comparePairs = originalPairs;
  vi.unstubAllEnvs();
});

function visibleText(html: string): string {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

async function md(handler: typeof peopleMarkdown, path: string, query = "") {
  return handler(new Request(`${people}/md${path}${query}`), { params: Promise.resolve({ path: path.slice(1).split("/") }) });
}

describe("comparison HTML consumers", () => {
  it("generates only publicly eligible curated params in stored orientation", () => {
    expect(generateStaticParams()).toEqual([{ pair: "zeta-vs-alpha" }]);
  });

  it("aligns curated metadata, visible order, intro and breadcrumb canonical", async () => {
    expect(await compareMetadata(pairParams("zeta-vs-alpha"))).toMatchObject({
      title: "zeta name vs alpha name", alternates: { canonical: `${people}/compare/zeta-vs-alpha` }, robots: { index: true, follow: true },
    });
    const html = renderToStaticMarkup(await ComparePage(pairParams("zeta-vs-alpha")));
    expect(visibleText(html)).toContain("zeta name vs alpha name");
    expect(visibleText(html)).toContain("Stored curated introduction");
    expect(html).toContain(`${people}/compare/zeta-vs-alpha`);
    expect(visibleText(html)).not.toContain("Unique intro lives on this URL only");
  });

  it("keeps a useful uncurated canonical page with noindex/follow", async () => {
    expect(await compareMetadata(pairParams("alpha-vs-beta"))).toMatchObject({
      alternates: { canonical: `${people}/compare/alpha-vs-beta` }, robots: { index: false, follow: true },
    });
    const text = visibleText(renderToStaticMarkup(await ComparePage(pairParams("alpha-vs-beta"))));
    expect(text).toContain("alpha name vs beta name");
    expect(text).toContain("Twin Scores side by side");
    expect(text).toContain("API");
  });

  it.each([["alpha-vs-zeta", "/compare/zeta-vs-alpha"], ["beta-vs-alpha", "/compare/alpha-vs-beta"]])("redirects %s before either metadata or content can expose a second page", async (pair, path) => {
    await expect(compareMetadata(pairParams(pair))).rejects.toMatchObject(redirectDigest(path));
    await expect(ComparePage(pairParams(pair))).rejects.toMatchObject(redirectDigest(path));
  });

  it.each(["alpha-vs-alpha", "zeta-vs-zeta", "zeta-vs-hidden-product", "draft-product-vs-alpha", "missing-vs-alpha", "alpha-vs-", "alpha-vs-beta-vs-zeta", "gamma-vs-delta-vs-alpha"])("404s %s before metadata or content", async (pair) => {
    await expect(compareMetadata(pairParams(pair))).rejects.toMatchObject(notFound);
    await expect(ComparePage(pairParams(pair))).rejects.toMatchObject(notFound);
  });
});

describe("real Markdown GET wrappers", () => {
  it("serves the stored curated order, facts and absolute canonical Link", async () => {
    const response = await md(peopleMarkdown, "/compare/zeta-vs-alpha");
    expect(response.status).toBe(200);
    expect(response.headers.get("link")).toBe(`<${people}/compare/zeta-vs-alpha>; rel="canonical"`);
    expect(response.headers.get("content-type")).toContain("text/markdown");
    expect(response.headers.get("vary")).toBe("Accept");
    expect(response.headers.get("x-robots-tag")).toBeNull();
    const body = await response.text();
    expect(body).toMatch(/^# zeta name vs alpha name/);
    expect(body).toContain("Stored curated introduction");
    expect(body.indexOf("| zeta name |")).toBeLessThan(body.indexOf("| alpha name |"));
  });

  it("exposes a noindex uncurated comparison with matching canonical facts/order", async () => {
    const response = await md(peopleMarkdown, "/compare/alpha-vs-beta");
    expect(response.status).toBe(200);
    expect(response.headers.get("link")).toBe(`<${people}/compare/alpha-vs-beta>; rel="canonical"`);
    expect(response.headers.get("x-robots-tag")).toBe("noindex, follow");
    expect(await response.text()).toMatch(/^# alpha name vs beta name/);
  });

  it.each([["alpha-vs-zeta", "/compare/zeta-vs-alpha"], ["beta-vs-alpha", "/compare/alpha-vs-beta"]])("returns a genuine wrapper308 for %s with a relative public Location and empty body", async (pair, path) => {
    const response = await md(peopleMarkdown, `/compare/${pair}`, "?next=https://elsewhere.invalid/");
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(path);
    expect(response.headers.get("location")).not.toContain("/md/");
    expect(response.headers.get("vary")).toBe("Accept");
    expect(await response.text()).toBe("");
    expect(pageMarkdown("people", `/compare/${pair}`)).toMatchObject({ status: 308, location: path, body: "" });
    expect((await md(peopleMarkdown, path)).status).toBe(200);
  });

  it.each(["alpha-vs-alpha", "zeta-vs-hidden-product", "missing-vs-alpha", "gamma-vs-delta-vs-alpha"])("retains404 and recovery links for %s without private intros", async (pair) => {
    const response = await md(peopleMarkdown, `/compare/${pair}`);
    expect(response.status).toBe(404);
    const body = await response.text();
    expect(body).toContain("# Not found");
    expect(body).toContain("[All products](/products)");
    expect(body).not.toContain("Private hidden introduction");
    expect(body).not.toContain("Ambiguous introduction");
    expect(response.headers.get("location")).toBeNull();
  });

  it.each(["zeta-vs-alpha", "alpha-vs-zeta", "alpha-vs-beta", "alpha-vs-alpha"])("does not introduce an Agents comparison for %s", async (pair) => {
    const response = await md(agentsMarkdown, `/compare/${pair}`);
    expect(response.status).toBe(404);
    expect(response.headers.get("location")).toBeNull();
  });

  it.each([[peopleMarkdown, "/products/google-inbox"], [peopleMarkdown, "/alternatives/google-inbox"], [agentsMarkdown, "/skills/google-inbox"]] as const)("preserves retired410 on wrapper%s %s", async (handler, path) => {
    const response = await md(handler, path);
    expect(response.status).toBe(410);
    expect(await response.text()).toContain("# Gone");
    expect(response.headers.get("vary")).toBe("Accept");
  });
});

describe("comparison links and URL spine consumers", () => {
  it.each([["product", ProductPage], ["alternatives", AlternativesPage]] as const)("retains all published alternatives but only stored curated comparison links on the %s page", async (_name, Page) => {
    const html = renderToStaticMarkup(await Page(slugParams("alpha")));
    expect(html).toContain('href="/products/zeta"');
    expect(html).toContain('href="/products/beta"');
    const links = [...html.matchAll(/href="(\/compare\/[^"#?]+)"/g)].map((match) => match[1]);
    expect(links).toEqual(["/compare/zeta-vs-alpha"]);
    expect(html).not.toContain("/products/hidden-product");
  });

  it("uses explicit twin origins for product/alternative canonical and product sibling URL", async () => {
    expect(await productMetadata(slugParams("alpha"))).toMatchObject({ alternates: { canonical: `${people}/products/alpha` } });
    expect(await alternativesMetadata(slugParams("alpha"))).toMatchObject({ alternates: { canonical: `${people}/alternatives/alpha` } });
    expect(renderToStaticMarkup(await ProductPage(slugParams("alpha")))).toContain(`href="${agents}/products/alpha"`);
  });

  it.each(["people", "agents"] as const)("honors both explicit twin origins throughout %s llms output", (site) => {
    const text = llmsTxt(site);
    expect(text).toContain(`Editor: Edu Tor (${people}/authors/edu-tor)`);
    expect(text).toContain(`People: ${people}`);
    expect(text).toContain(`Agents: ${agents}`);
    expect(text).toContain(`Other twin: ${site === "people" ? agents : people}`);
    expect(text).toContain("We do not emit AggregateRating");
  });

  it("uses the agents URL spine for a skill's rubric without changing publication filtering", () => {
    expect(skillMd("alpha")).toContain(`Rubric: ${agents}/scorecard`);
    expect(skillMd("hidden-product")).toBe("");
  });
});
