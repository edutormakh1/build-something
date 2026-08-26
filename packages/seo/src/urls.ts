import {
  allArticles,
  allAuthors,
  allCategories,
  allProducts,
  catalog,
  productsInCategory,
} from "@bs/db";
import type { SiteId } from "./sites";
import { abs } from "./sites";

export type UrlEntry = { path: string; title: string; lastmod?: string };

function dateOnly(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.slice(0, 10);
}

const CATALOG_DAY = dateOnly(catalog.generatedAt) ?? "2026-08-25";

export function peopleStatic(): UrlEntry[] {
  return [
    { path: "/", title: "Home", lastmod: CATALOG_DAY },
    { path: "/products", title: "All products", lastmod: CATALOG_DAY },
    { path: "/blog", title: "Blog", lastmod: CATALOG_DAY },
    { path: "/about", title: "About", lastmod: CATALOG_DAY },
    { path: "/methodology", title: "Methodology", lastmod: CATALOG_DAY },
    { path: "/editorial-policy", title: "Editorial policy", lastmod: CATALOG_DAY },
    { path: "/contact", title: "Contact", lastmod: CATALOG_DAY },
    { path: "/scorecard", title: "Twin Score rubric", lastmod: CATALOG_DAY },
    { path: "/for-agents", title: "For agents", lastmod: CATALOG_DAY },
    { path: "/submit", title: "Submit a product", lastmod: CATALOG_DAY },
  ];
}

export function agentsStatic(): UrlEntry[] {
  return [
    { path: "/", title: "Home", lastmod: CATALOG_DAY },
    { path: "/products", title: "All products", lastmod: CATALOG_DAY },
    { path: "/for-agents", title: "Build Something Agents Want developer resources", lastmod: CATALOG_DAY },
    { path: "/api", title: "API docs", lastmod: CATALOG_DAY },
    { path: "/about", title: "About", lastmod: CATALOG_DAY },
    { path: "/methodology", title: "Methodology", lastmod: CATALOG_DAY },
    { path: "/scorecard", title: "Twin Score rubric", lastmod: CATALOG_DAY },
  ];
}

export function entityUrls(site: SiteId): UrlEntry[] {
  const products = allProducts();
  const urls: UrlEntry[] = [];
  for (const p of products) {
    const lastmod = dateOnly(p.twin.updated) ?? CATALOG_DAY;
    urls.push({ path: `/products/${p.slug}`, title: p.name, lastmod });
    if (site === "people") {
      urls.push({ path: `/alternatives/${p.slug}`, title: `Alternatives to ${p.name}`, lastmod });
    } else {
      urls.push({ path: `/skills/${p.slug}`, title: `SKILL.md for ${p.name}`, lastmod });
    }
  }
  for (const c of allCategories()) {
    urls.push({ path: `/categories/${c.slug}`, title: c.name, lastmod: CATALOG_DAY });
    if (site === "people" && productsInCategory(c.slug).length) {
      urls.push({ path: `/best/${c.slug}`, title: `Best ${c.name}`, lastmod: CATALOG_DAY });
    }
  }
  if (site === "people") {
    for (const r of catalog.reviews.filter((x) => x.status === "published")) {
      urls.push({ path: `/reviews/${r.slug}`, title: r.title, lastmod: dateOnly(r.publishedAt) ?? CATALOG_DAY });
    }
    for (const a of allAuthors()) {
      urls.push({ path: `/authors/${a.slug}`, title: a.name, lastmod: CATALOG_DAY });
    }
    for (const a of allArticles()) {
      urls.push({ path: `/blog/${a.slug}`, title: a.title, lastmod: dateOnly(a.updatedAt) ?? dateOnly(a.publishedAt) ?? CATALOG_DAY });
    }
    for (const pair of catalog.comparePairs) {
      urls.push({
        path: `/compare/${pair.a}-vs-${pair.b}`,
        title: `${pair.a} vs ${pair.b}`,
        lastmod: CATALOG_DAY,
      });
    }
  }
  return urls;
}

export function allCanonical(site: SiteId): UrlEntry[] {
  const staticPages = site === "people" ? peopleStatic() : agentsStatic();
  const seen = new Set<string>();
  const out: UrlEntry[] = [];
  for (const u of [...staticPages, ...entityUrls(site)]) {
    if (seen.has(u.path)) continue;
    seen.add(u.path);
    out.push(u);
  }
  return out;
}

function xmlEscape(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function sitemapXml(site: SiteId, paths: UrlEntry[]): string {
  const body = paths
    .map((u) => {
      const loc = xmlEscape(abs(site, u.path));
      const last = u.lastmod ? `<lastmod>${xmlEscape(u.lastmod)}</lastmod>` : "";
      return `  <url><loc>${loc}</loc>${last}</url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function sitemapIndexXml(site: SiteId, files: string[]): string {
  const last = `<lastmod>${CATALOG_DAY}</lastmod>`;
  const body = files
    .map((f) => `  <sitemap><loc>${xmlEscape(abs(site, f))}</loc>${last}</sitemap>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}
