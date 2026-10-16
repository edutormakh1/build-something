import { createRequire } from "node:module";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  allProducts,
  alternativesOf,
  catalog,
  getProduct,
  getReview,
  reviewsFor,
  type Product,
  type Review,
} from "../packages/db/src/catalog";
import { handleGetProduct, handleListReviews, listProducts, productPayload } from "../packages/seo/src/api";
import { pageMarkdown, skillMd } from "../packages/seo/src/markdown";
import { allCanonical, sitemapXml } from "../packages/seo/src/urls";
import { GET as rawSkill } from "../apps/agents/app/skills/[slug]/raw/route";
import AuthorPage from "../apps/people/app/authors/[slug]/page";
import ReviewPage, { generateMetadata as reviewMetadata, generateStaticParams as reviewParams } from "../apps/people/app/reviews/[slug]/page";
import ProductPage, { generateMetadata as productMetadata } from "../apps/people/app/products/[slug]/page";
import SkillPage, { generateMetadata as skillMetadata } from "../apps/agents/app/skills/[slug]/page";

// These page tests exercise their real selection and rendering, without the
// unrelated shared UI barrel loading browser/WebGL/font infrastructure.
vi.mock("@bs/ui", () => ({ JsonLd: () => null }));
const appRequire = createRequire(new URL("../apps/people/package.json", import.meta.url));
const { renderToStaticMarkup } = appRequire("react-dom/server");

const original = {
  products: catalog.products,
  reviews: catalog.reviews,
  comparePairs: catalog.comparePairs,
};
const author = catalog.authors[0].slug;
const productTemplate = catalog.products[0];
const reviewTemplate = catalog.reviews[0];
const params = (slug: string) => ({ params: Promise.resolve({ slug }) });

function product(slug: string, status: Product["status"] = "published"): Product {
  return { ...productTemplate, slug, status, name: `${slug} name`, longDescription: `${slug} private description`, alternatives: [] };
}

function review(slug: string, parent = "visible", status: Review["status"] = "published"): Review {
  return { ...reviewTemplate, slug, product: parent, status, author, title: `${slug} title`, body: `${slug} private body` };
}

beforeAll(() => vi.stubGlobal("React", appRequire("react")));
afterAll(() => vi.unstubAllGlobals());
beforeEach(() => {
  catalog.products = [
    { ...product("visible"), alternatives: ["other", "draft-product", "hidden-product", "unknown-product"] },
    product("other"),
    product("draft-product", "draft"),
    product("hidden-product", "hidden"),
  ];
  catalog.reviews = [
    review("visible-review"),
    review("pending-review", "visible", "pending"),
    review("draft-review", "visible", "draft"),
    review("hidden-review", "visible", "hidden"),
    review("draft-parent-review", "draft-product"),
    review("hidden-parent-review", "hidden-product"),
    review("orphan-review", "unknown-product"),
  ];
  catalog.comparePairs = [
    { a: "visible", b: "other", intro: "Visible comparison" },
    { a: "visible", b: "draft-product", intro: "Private comparison" },
    { a: "hidden-product", b: "visible", intro: "Private comparison" },
    { a: "visible", b: "unknown-product", intro: "Missing comparison" },
  ];
});
afterEach(() => Object.assign(catalog, original));

describe("public product boundary", () => {
  it("keeps published selectors and successful API payload shapes", async () => {
    expect(allProducts().map((p) => p.slug)).toEqual(["visible", "other"]);
    expect(getProduct("visible")?.name).toBe("visible name");
    expect(listProducts().map((p) => p.slug)).toEqual(["visible", "other"]);
    const response = handleGetProduct("visible", "/api/v1/products/visible");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    const body = await response.json();
    expect(Object.keys(body)).toEqual(["data"]);
    expect(Object.keys(body.data).sort()).toEqual([
      "alternatives", "capabilities", "category", "description", "name", "pricing", "reviews", "slug", "twin", "vendor", "website",
    ]);
    expect(body.data.reviews).toEqual([{ slug: "visible-review", kind: reviewTemplate.kind, title: "visible-review title" }]);
  });

  it.each(["draft-product", "hidden-product", "unknown-product"])("hides %s consistently across selectors, API, metadata and skill raw", async (slug) => {
    expect(getProduct(slug)).toBeUndefined();
    expect(productPayload(slug)).toBeNull();
    for (const response of [handleGetProduct(slug, `/api/v1/products/${slug}`), handleListReviews(slug, "/api/v1/reviews")]) {
      expect(response.status).toBe(404);
      expect(response.headers.get("content-type")).toContain("application/problem+json");
      expect(await response.json()).toMatchObject({ status: 404, code: "not_found" });
    }
    expect(await productMetadata(params(slug))).toEqual({ title: "Not found" });
    expect(await skillMetadata(params(slug))).toEqual({ title: "Not found" });
    await expect(ProductPage(params(slug))).rejects.toThrow();
    await expect(SkillPage(params(slug))).rejects.toThrow();
    expect(skillMd(slug)).toBe("");
    const raw = await rawSkill(new Request("http://localhost/"), params(slug));
    expect(raw.status).toBe(404);
    expect(await raw.text()).toBe("Not found");
  });

  it.each(["draft-product", "hidden-product", "unknown-product"])("404s product, alternative and skill Markdown for %s without entity content", (slug) => {
    for (const [site, path] of [
      ["people", `/products/${slug}`], ["agents", `/products/${slug}`],
      ["people", `/alternatives/${slug}`], ["agents", `/skills/${slug}`],
    ] as const) {
      const result = pageMarkdown(site, path);
      expect(result.status).toBe(404);
      expect(result.body).toContain("[All products](/products)");
      expect(result.body).not.toContain(`${slug} private description`);
    }
  });

  it("excludes private and unresolved alternative references from API and skill documents", async () => {
    expect(alternativesOf("visible").map((p) => p.slug)).toEqual(["other"]);
    expect(productPayload("visible")?.alternatives).toEqual(["other"]);
    expect(listProducts()[0].alternatives).toEqual(["other"]);
    const raw = await rawSkill(new Request("http://localhost/"), params("visible"));
    expect(raw.status).toBe(200);
    expect(raw.headers.get("content-type")).toContain("text/markdown");
    const documents = [skillMd("visible"), await raw.text(), pageMarkdown("agents", "/skills/visible").body, pageMarkdown("people", "/alternatives/visible").body];
    for (const body of documents) {
      expect(body).toContain("other");
      for (const slug of ["draft-product", "hidden-product", "unknown-product"]) expect(body).not.toContain(slug);
    }
  });
});

describe("public review boundary", () => {
  it("preserves published reviews for a published parent", async () => {
    expect(getReview("visible-review")?.title).toBe("visible-review title");
    expect(reviewsFor("visible").map((r) => r.slug)).toEqual(["visible-review"]);
    expect(pageMarkdown("people", "/reviews/visible-review").status).toBe(200);
    const response = handleListReviews("visible", "/api/v1/reviews");
    expect(response.status).toBe(200);
    expect((await response.json()).data.map((r: Review) => r.slug)).toEqual(["visible-review"]);
  });

  it.each(["pending-review", "draft-review", "hidden-review", "draft-parent-review", "hidden-parent-review", "orphan-review", "unknown-review"])("does not reveal %s via review selection, metadata or page body", async (slug) => {
    expect(getReview(slug)).toBeUndefined();
    const md = pageMarkdown("people", `/reviews/${slug}`);
    expect(md.status).toBe(404);
    expect(md.body).not.toContain(`${slug} private body`);
    expect(await reviewMetadata(params(slug))).toEqual({ title: "Not found" });
    await expect(ReviewPage(params(slug))).rejects.toThrow();
  });

  it.each(["draft-product", "hidden-product", "unknown-product"])("does not list published reviews of %s", (parent) => {
    expect(reviewsFor(parent)).toEqual([]);
  });

  it("only generates publicly visible review params", () => {
    expect(reviewParams()).toEqual([{ slug: "visible-review" }]);
  });

  it("does not reveal private-parent review titles in an author's rendered selected reviews", async () => {
    const html = renderToStaticMarkup(await AuthorPage(params(author)));
    expect(html).toContain('href="/reviews/visible-review"');
    expect(html).toContain("visible-review title");
    for (const r of catalog.reviews.filter((r) => r.slug !== "visible-review")) {
      expect(html).not.toContain(`/reviews/${r.slug}`);
      expect(html).not.toContain(r.title);
    }
  });

  it("omits all private and orphan reviews from the unfiltered API", async () => {
    const response = handleListReviews(null, "/api/v1/reviews");
    expect(response.status).toBe(200);
    expect((await response.json()).data.map((r: Review) => r.slug)).toEqual(["visible-review"]);
  });
});

describe("comparison statuses and discovery references", () => {
  it.each(["visible-vs-unknown-product", "unknown-product-vs-visible", "visible-vs-draft-product", "hidden-product-vs-visible"])("returns recovery Markdown with HTTP 404 for %s", (pair) => {
    const result = pageMarkdown("people", `/compare/${pair}`);
    expect(result.status).toBe(404);
    expect(result.body).toContain("# Not found");
    expect(result.body).toContain("[All products](/products)");
    expect(result.body).not.toContain("Private comparison");
  });

  it.each(["visible-vs-other", "other-vs-visible", "visible-vs-visible", "other-vs-other"])("preserves existing two-published-product behavior for %s pending S03", (pair) => {
    expect(pageMarkdown("people", `/compare/${pair}`).status).toBe(200);
  });

  it.each(["people", "agents"] as const)("includes only visible entity links in the %s sitemap", (site) => {
    const urls = allCanonical(site);
    const paths = urls.map((u) => u.path);
    expect(paths).toContain("/products/visible");
    expect(paths).toContain("/products/other");
    const xml = sitemapXml(site, urls);
    for (const slug of ["draft-product", "hidden-product", "unknown-product", "pending-review", "draft-review", "hidden-review", "draft-parent-review", "hidden-parent-review", "orphan-review"]) {
      expect(xml).not.toContain(slug);
    }
    if (site === "people") {
      expect(paths).toContain("/compare/visible-vs-other");
      expect(paths).toContain("/reviews/visible-review");
      expect(paths).toContain(`/authors/${author}`);
    } else expect(paths).toContain("/skills/visible");
  });

  it("preserves the existing retired Markdown 410 contract", () => {
    const slug = catalog.retiredSlugs[0];
    for (const [site, path] of [["people", `/products/${slug}`], ["people", `/alternatives/${slug}`], ["agents", `/skills/${slug}`]] as const) {
      expect(pageMarkdown(site, path).status).toBe(410);
    }
  });
});
