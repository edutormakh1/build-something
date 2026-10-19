import raw from "../seed/catalog.json";
import type { Article, Author, Catalog, Category, Product, Review } from "./types";

export const catalog = raw as Catalog;

export function allProducts(): Product[] {
  return catalog.products.filter((p) => p.status === "published");
}

export function getProduct(slug: string): Product | undefined {
  return catalog.products.find((p) => p.slug === slug && p.status === "published");
}

export function allCategories(): Category[] {
  return catalog.categories;
}

export function getCategory(slug: string): Category | undefined {
  return catalog.categories.find((c) => c.slug === slug);
}

export function productsInCategory(slug: string): Product[] {
  return allProducts().filter(
    (p) => p.category === slug || p.extraCategories.includes(slug),
  );
}

export function allAuthors(): Author[] {
  return catalog.authors;
}

export function getAuthor(slug: string): Author | undefined {
  return catalog.authors.find((a) => a.slug === slug);
}

export function reviewsFor(product: string): Review[] {
  if (!getProduct(product)) return [];
  return catalog.reviews.filter(
    (r) => r.product === product && r.status === "published",
  );
}

export function getReview(slug: string): Review | undefined {
  return catalog.reviews.find(
    (r) => r.slug === slug && r.status === "published" && Boolean(getProduct(r.product)),
  );
}

export function allArticles(): Article[] {
  return catalog.articles;
}

export function getArticle(slug: string): Article | undefined {
  return catalog.articles.find((a) => a.slug === slug);
}

export function alternativesOf(slug: string): Product[] {
  const p = getProduct(slug);
  if (!p) return [];
  return p.alternatives
    .map(getProduct)
    .filter((x): x is Product => Boolean(x));
}

export function comparePair(a: string, b: string) {
  const [x, y] = a < b ? [a, b] : [b, a];
  return catalog.comparePairs.find((p) => {
    const [i, j] = p.a < p.b ? [p.a, p.b] : [p.b, p.a];
    return i === x && j === y;
  });
}

export function isRetired(slug: string): boolean {
  return catalog.retiredSlugs.includes(slug);
}

export function searchProducts(q: string): Product[] {
  const s = q.trim().toLowerCase();
  if (!s) return allProducts();
  return allProducts().filter((p) =>
    [p.name, p.vendor, p.description, p.slug, ...p.tags].join(" ").toLowerCase().includes(s),
  );
}

export type { Article, Author, Catalog, Category, Product, Review } from "./types";
