import { createHash } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { catalog, type Product, type Review } from "../packages/db/src/catalog";
import { abs, type SiteId } from "../packages/seo/src/sites";
import { allCanonical } from "../packages/seo/src/urls";
import { GET as peopleChild } from "../apps/people/app/sitemaps/[name]/route";
import { GET as agentsChild } from "../apps/agents/app/sitemaps/[name]/route";
import { GET as peopleIndex } from "../apps/people/app/sitemap.xml/route";
import { GET as agentsIndex } from "../apps/agents/app/sitemap.xml/route";

type Entry = { loc: string; lastmod: string };
const names = ["pages.xml", "products.xml", "editorial.xml"] as const;
const original = { products: catalog.products, reviews: catalog.reviews, comparePairs: catalog.comparePairs };
afterEach(() => Object.assign(catalog, original));
const decode = (value: string) => value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const entries = (xml: string, element: "url" | "sitemap" = "url"): Entry[] => [...xml.matchAll(new RegExp(`<${element}>(.*?)</${element}>`, "gs"))].map((match) => ({
  loc: decode(match[1].match(/<loc>(.*?)<\/loc>/s)![1]),
  lastmod: match[1].match(/<lastmod>(.*?)<\/lastmod>/s)?.[1] ?? "",
}));
const childGet = (site: SiteId) => site === "people" ? peopleChild : agentsChild;
const sorted = (rows: Entry[]) => rows.slice().sort((a, b) => a.loc < b.loc ? -1 : a.loc > b.loc ? 1 : 0);
const unique = (rows: Entry[]) => [...new Map(rows.map((row) => [row.loc, row])).values()];
const locs = (rows: Entry[]) => rows.map((row) => row.loc);
async function child(site: SiteId, name: string) {
  return childGet(site)(new Request(`http://localhost/sitemaps/${name}`), { params: Promise.resolve({ name }) });
}
async function partitions(site: SiteId) {
  return Promise.all(names.map(async (name) => {
    const response = await child(site, name);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/xml; charset=utf-8");
    const xml = await response.text();
    expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
    return entries(xml);
  }));
}

function expectPartition(rows: Entry[][], site: SiteId) {
  for (const slice of rows) expect(new Set(locs(slice)).size).toBe(slice.length);
  for (let a = 0; a < rows.length; a++) {
    for (let b = a + 1; b < rows.length; b++) {
      expect(locs(rows[a]).filter((loc) => locs(rows[b]).includes(loc)), `${site} ${names[a]} intersects ${names[b]}`).toEqual([]);
    }
  }
  const expected = allCanonical(site).map((row) => ({ loc: abs(site, row.path), lastmod: row.lastmod ?? "" }));
  expect(sorted(rows.flat())).toEqual(sorted(expected));
  for (const slice of rows) {
    const memberLocs = new Set(locs(slice));
    expect(slice).toEqual(expected.filter((row) => memberLocs.has(row.loc)));
  }
}

describe.each([
  ["people", 357, [7, 189, 161]],
  ["agents", 161, [2, 154, 5]],
] as const)("%s public sitemap children", (site, count, childCounts) => {
  it("retains the exact three index destinations and catalog lastmod", async () => {
    const response = (site === "people" ? peopleIndex : agentsIndex)();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/xml; charset=utf-8");
    const xml = await response.text();
    expect(xml).toContain('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(entries(xml, "sitemap")).toEqual(names.map((name) => ({ loc: abs(site, `/sitemaps/${name}`), lastmod: catalog.generatedAt.slice(0, 10) })));
  });

  it("assigns every eligible URL exactly once without changing lastmod or retained order", async () => {
    expectPartition(await partitions(site), site);
  });

  it("preserves the complete unique set and measures the exact corrected child counts", async () => {
    const rows = await partitions(site);
    const set = sorted(unique(rows.flat()));
    // This public inventory records before/after evidence without inspecting build artifacts.
    console.info(JSON.stringify({ site, counts: rows.map((slice) => slice.length), total: rows.flat().length, unique: set.length, uniqueLastmodSha256: createHash("sha256").update(JSON.stringify(set)).digest("hex") }));
    expect(set).toHaveLength(count);
    expect(set).toEqual(sorted(allCanonical(site).map((row) => ({ loc: abs(site, row.path), lastmod: row.lastmod! }))));
    expect(rows.map((slice) => slice.length)).toEqual(childCounts);
    expect(rows.flat()).toHaveLength(count);
  });

  it("keeps static destinations under one semantic child and the product index out of product entities", async () => {
    const [pages, products, editorial] = await partitions(site);
    const expectedPages = site === "people"
      ? ["/", "/products", "/about", "/contact", "/for-agents", "/api", "/submit"]
      : ["/", "/products"];
    expect(locs(pages)).toEqual(expectedPages.map((path) => abs(site, path)));
    expect(locs(products)).not.toContain(abs(site, "/products"));
    const expectedEditorialStatic = site === "people"
      ? ["/blog", "/methodology", "/editorial-policy", "/scorecard"]
      : ["/for-agents", "/api", "/about", "/methodology", "/scorecard"];
    for (const path of expectedEditorialStatic) expect(locs(editorial)).toContain(abs(site, path));
  });

  it("omits query variants, account chrome, Markdown and machine resource representations", async () => {
    const urls = (await partitions(site)).flat().map((row) => new URL(row.loc));
    for (const url of urls) {
      expect(url.search).toBe("");
      expect(url.hash).toBe("");
      expect(url.pathname).not.toMatch(/^\/(?:admin|account|login|signup|forgot-password|reset-password|auth|md|dataset|\.well-known|api\/v1|openapi\.json|llms(?:-full)?\.txt)(?:\/|$)/);
      expect(url.pathname).not.toMatch(/^\/skills\/[^/]+\/raw$/);
      expect(catalog.retiredSlugs.some((slug) => ["products", "alternatives", "skills"].some((prefix) => url.pathname === `/${prefix}/${slug}`))).toBe(false);
    }
  });

  it.each(["missing.xml", "Pages.xml", "constructor", "__proto__", "pages.xml?q=extra"])("keeps unknown child %s at 404", async (name) => {
    const response = await child(site, name);
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not found");
  });
});

it("preserves all 25 stored curated orientations, excluding reverse and useful uncurated variants", async () => {
  const [people, agents] = await Promise.all([partitions("people"), partitions("agents")]);
  expect(original.comparePairs).toHaveLength(25);
  const expected = original.comparePairs.map((pair) => abs("people", `/compare/${pair.a}-vs-${pair.b}`));
  expect(locs(people[1]).filter((loc) => new URL(loc).pathname.startsWith("/compare/"))).toEqual(expected);
  for (const pair of original.comparePairs) expect(locs(people.flat())).not.toContain(abs("people", `/compare/${pair.b}-vs-${pair.a}`));
  expect(locs(people.flat())).not.toContain(abs("people", "/compare/chatgpt-vs-cursor"));
  expect(locs(people.flat())).not.toContain(abs("people", "/compare/cursor-vs-chatgpt"));
  expect(locs(agents.flat()).some((loc) => new URL(loc).pathname.startsWith("/compare/"))).toBe(false);
});

function publicationFixture() {
  const product = (slug: string, status: Product["status"] = "published"): Product => ({ ...original.products[0], slug, name: `${slug} public fixture`, status, extraCategories: [], alternatives: [], twin: { ...original.products[0].twin, updated: "2026-09-17T04:05:06Z" } });
  const review = (slug: string, parent = "zeta", status: Review["status"] = "published"): Review => ({ ...original.reviews[0], slug, product: parent, status, publishedAt: "2026-09-19T02:03:04Z" });
  catalog.products = [product("zeta"), product("alpha"), product("beta"), product("draft-product", "draft"), product("hidden-product", "hidden")];
  catalog.reviews = [review("visible-review"), review("pending-review", "zeta", "pending"), review("draft-review", "zeta", "draft"), review("hidden-review", "zeta", "hidden"), review("draft-parent-review", "draft-product"), review("hidden-parent-review", "hidden-product"), review("orphan-review", "absent")];
  catalog.comparePairs = [
    { a: "zeta", b: "alpha", intro: "Stored nonlexical orientation" },
    { a: "zeta", b: "zeta", intro: "Invalid self pair" },
    { a: "zeta", b: "draft-product", intro: "Private draft pair" },
    { a: "hidden-product", b: "alpha", intro: "Private hidden pair" },
    { a: "absent", b: "alpha", intro: "Absent pair" },
  ];
}

it.each(["people", "agents"] as const)("keeps %s publication boundaries and exact fixture dates while partitioning", async (site) => {
  publicationFixture();
  const rows = await partitions(site);
  expectPartition(rows, site);
  const paths = rows.flat().map((row) => new URL(row.loc).pathname);
  expect(paths.filter((path) => path.startsWith("/products/"))).toEqual(["/products/zeta", "/products/alpha", "/products/beta"]);
  expect(paths.filter((path) => path.startsWith(site === "people" ? "/alternatives/" : "/skills/"))).toEqual(["zeta", "alpha", "beta"].map((slug) => `${site === "people" ? "/alternatives" : "/skills"}/${slug}`));
  expect(paths.filter((path) => path.startsWith("/reviews/"))).toEqual(site === "people" ? ["/reviews/visible-review"] : []);
  expect(paths.filter((path) => path.startsWith("/compare/"))).toEqual(site === "people" ? ["/compare/zeta-vs-alpha"] : []);
  for (const path of paths) expect(path).not.toMatch(/draft-product|hidden-product|pending-review|draft-review|hidden-review|parent-review|orphan-review|alpha-vs-zeta|alpha-vs-beta|beta-vs-alpha/);
  for (const slug of ["zeta", "alpha", "beta"]) expect(rows.flat().find((row) => row.loc === abs(site, `/products/${slug}`))!.lastmod).toBe("2026-09-17");
  if (site === "people") expect(rows.flat().find((row) => row.loc === abs(site, "/reviews/visible-review"))!.lastmod).toBe("2026-09-19");
  expect(rows.flat()).toHaveLength(site === "people" ? 40 : 23);
  catalog.products = catalog.products.map((product) => product.slug === "zeta" ? { ...product, status: "hidden" } : product);
  const hiddenRows = await partitions(site);
  expectPartition(hiddenRows, site);
  expect(locs(hiddenRows.flat()).some((loc) => /zeta|visible-review/.test(loc))).toBe(false);
});
