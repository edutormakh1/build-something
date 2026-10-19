import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { catalog, type Product } from "../packages/db/src/catalog";
import { allCanonical } from "../packages/seo/src/urls";
import { curatedComparisonPath, curatedComparisons, resolveComparison } from "../packages/seo/src/comparisons";

const originalProducts = catalog.products;
const originalPairs = catalog.comparePairs;
afterEach(() => {
  catalog.products = originalProducts;
  catalog.comparePairs = originalPairs;
});

function fixture() {
  const product = (slug: string, status: Product["status"] = "published"): Product => ({ ...originalProducts[0], slug, status });
  catalog.products = [product("zeta"), product("alpha"), product("beta"), product("draft-product", "draft"), product("hidden-product", "hidden"), product("gamma-vs-delta")];
  catalog.comparePairs = [
    { a: "zeta", b: "alpha", intro: "Stored non-lexical orientation" },
    { a: "zeta", b: "zeta", intro: "Invalid self comparison" },
    { a: "zeta", b: "draft-product", intro: "Private draft intro" },
    { a: "hidden-product", b: "alpha", intro: "Private hidden intro" },
    { a: "missing", b: "alpha", intro: "Unknown operand" },
    { a: "gamma-vs-delta", b: "zeta", intro: "Ambiguous separator" },
  ];
}

describe("curated comparison discovery", () => {
  it("preserves every one of the current 25 stored path orientations", () => {
    expect(originalPairs).toHaveLength(25);
    expect(originalPairs.filter((pair) => pair.a > pair.b)).toHaveLength(17);
    expect(allCanonical("people").filter((url) => url.path.startsWith("/compare/")).map((url) => url.path))
      .toEqual(originalPairs.map((pair) => `/compare/${pair.a}-vs-${pair.b}`));
    expect(curatedComparisons().map((comparison) => comparison.path))
      .toEqual(originalPairs.map((pair) => `/compare/${pair.a}-vs-${pair.b}`));
    for (const pair of originalPairs) {
      const path = `/compare/${pair.a}-vs-${pair.b}`;
      expect(resolveComparison(`${pair.a}-vs-${pair.b}`)).toMatchObject({
        kind: "page", path, a: { slug: pair.a }, b: { slug: pair.b }, intro: pair.intro, indexable: true,
      });
      expect(resolveComparison(`${pair.b}-vs-${pair.a}`)).toEqual({ kind: "redirect", path });
      expect(curatedComparisonPath(pair.a, pair.b)).toBe(path);
      expect(curatedComparisonPath(pair.b, pair.a)).toBe(path);
    }
  });

  it("excludes self, ambiguous, private and missing operands from comparison sitemap discovery", () => {
    fixture();
    expect(allCanonical("people").filter((url) => url.path.startsWith("/compare/")).map((url) => url.path))
      .toEqual(["/compare/zeta-vs-alpha"]);
  });

  it.each([false, true])("rejects duplicate unordered curated entries instead of choosing an orientation (reverse=%s)", (reverse) => {
    fixture();
    catalog.comparePairs = [catalog.comparePairs[0], { a: reverse ? "alpha" : "zeta", b: reverse ? "zeta" : "alpha", intro: "Conflicting duplicate" }];
    expect(() => allCanonical("people")).toThrow(/Duplicate curated comparison/);
  });
});

describe("shared public comparison resolution", () => {
  beforeEach(() => fixture());

  it("preserves the curated non-lexical order and intro, redirecting only the reverse", () => {
    expect(resolveComparison("zeta-vs-alpha")).toMatchObject({
      kind: "page", path: "/compare/zeta-vs-alpha", a: { slug: "zeta" }, b: { slug: "alpha" },
      intro: "Stored non-lexical orientation", indexable: true,
    });
    expect(resolveComparison("alpha-vs-zeta")).toEqual({ kind: "redirect", path: "/compare/zeta-vs-alpha" });
    expect(curatedComparisonPath("alpha", "zeta")).toBe("/compare/zeta-vs-alpha");
  });

  it("keeps an uncurated published page in one code-point order, noindex, without promoting it to discovery", () => {
    const page = resolveComparison("alpha-vs-beta");
    expect(page).toMatchObject({ kind: "page", path: "/compare/alpha-vs-beta", a: { slug: "alpha" }, b: { slug: "beta" }, indexable: false });
    expect(page).not.toHaveProperty("intro");
    expect(resolveComparison("beta-vs-alpha")).toEqual({ kind: "redirect", path: "/compare/alpha-vs-beta" });
    expect(curatedComparisonPath("alpha", "beta")).toBeUndefined();
    expect(curatedComparisonPath("beta", "alpha")).toBeUndefined();
    expect(curatedComparisons().map((comparison) => comparison.path)).toEqual(["/compare/zeta-vs-alpha"]);
  });

  it.each([
    "", "alpha", "-vs-alpha", "alpha-vs-", "alpha-vs-beta-vs-zeta", "alpha-vs-beta-vs-",
    "Alpha-vs-beta", "../alpha-vs-beta", "alpha%2F-vs-beta", "alpha-vs-beta?next=elsewhere",
    "/compare/alpha-vs-beta", "alpha--vs-beta", "alpha-vs--beta", " alpha-vs-beta ", "alpha-vs-beta/",
  ])("rejects malformed or ambiguous route parameter %s without canonical guessing", (input) => {
    expect(resolveComparison(input)).toEqual({ kind: "not-found" });
  });

  it.each(["alpha-vs-alpha", "zeta-vs-zeta", "zeta-vs-draft-product", "hidden-product-vs-alpha", "missing-vs-alpha", "alpha-vs-missing"])("rejects self, private or absent products for %s without returning facts or an intro", (input) => {
    expect(resolveComparison(input)).toEqual({ kind: "not-found" });
  });

  it("does not create comparison links for self, ambiguous, private or absent operands", () => {
    for (const [a, b] of [["zeta", "zeta"], ["gamma-vs-delta", "zeta"], ["zeta", "draft-product"], ["hidden-product", "alpha"], ["missing", "alpha"]]) {
      expect(curatedComparisonPath(a, b)).toBeUndefined();
    }
  });

  it("uses ordinary code-point ordering for hyphenated and numeric-looking uncurated slugs", () => {
    const slugs = ["z-9", "z0"];
    catalog.products = slugs.map((slug) => ({ ...originalProducts[0], slug }));
    catalog.comparePairs = [];
    const [a, b] = slugs.slice().sort();
    expect(resolveComparison(`${a}-vs-${b}`)).toMatchObject({ kind: "page", path: `/compare/${a}-vs-${b}`, a: { slug: a }, b: { slug: b }, indexable: false });
    expect(resolveComparison(`${b}-vs-${a}`)).toEqual({ kind: "redirect", path: `/compare/${a}-vs-${b}` });
  });

  it.each(["zeta", "missing"])("fails validation for duplicate unordered curated rows, including %s operands", (slug) => {
    catalog.comparePairs = [{ a: slug, b: "alpha", intro: "One" }, { a: "alpha", b: slug, intro: "Two" }];
    expect(() => curatedComparisons()).toThrow(/Duplicate curated comparison/);
    expect(() => resolveComparison("zeta-vs-alpha")).toThrow(/Duplicate curated comparison/);
    expect(() => curatedComparisonPath("zeta", "alpha")).toThrow(/Duplicate curated comparison/);
  });

  it("observes publication changes without retaining stale published objects or paths", () => {
    expect(curatedComparisons()).toHaveLength(1);
    catalog.products = catalog.products.map((product) => product.slug === "zeta" ? { ...product, status: "hidden" } : product);
    expect(curatedComparisons()).toEqual([]);
    expect(resolveComparison("zeta-vs-alpha")).toEqual({ kind: "not-found" });
    expect(curatedComparisonPath("alpha", "zeta")).toBeUndefined();
  });
});
