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

export type UrlEntry = { path: string; title: string; changefreq?: string; priority?: number };

export function peopleStatic(): UrlEntry[] {
  return [
    { path: "/", title: "Home", priority: 1 },
    { path: "/products", title: "All products", priority: 0.9 },
    { path: "/blog", title: "Blog", priority: 0.8 },
    { path: "/about", title: "About", priority: 0.6 },
    { path: "/methodology", title: "Methodology", priority: 0.7 },
    { path: "/editorial-policy", title: "Editorial policy", priority: 0.6 },
    { path: "/contact", title: "Contact", priority: 0.4 },
    { path: "/scorecard", title: "Twin Score rubric", priority: 0.8 },
    { path: "/for-agents", title: "For agents", priority: 0.7 },
    { path: "/submit", title: "Submit a product", priority: 0.4 },
    { path: "/signup", title: "Sign up" },
    { path: "/login", title: "Log in" },
    { path: "/forgot-password", title: "Forgot password" },
    { path: "/account", title: "Account" },
    { path: "/admin", title: "Admin" },
  ];
}

export function agentsStatic(): UrlEntry[] {
  return [
    { path: "/", title: "Home", priority: 1 },
    { path: "/products", title: "All products", priority: 0.9 },
    { path: "/for-agents", title: "Build Something Agents Want developer resources", priority: 0.9 },
    { path: "/api", title: "API docs", priority: 0.8 },
    { path: "/about", title: "About", priority: 0.6 },
    { path: "/methodology", title: "Methodology", priority: 0.7 },
    { path: "/scorecard", title: "Twin Score rubric", priority: 0.8 },
    { path: "/signup", title: "Sign up" },
    { path: "/login", title: "Log in" },
  ];
}

export function entityUrls(site: SiteId): UrlEntry[] {
  const products = allProducts();
  const urls: UrlEntry[] = [];
  for (const p of products) {
    urls.push({ path: `/products/${p.slug}`, title: p.name, priority: 0.8 });
    if (site === "people") {
      urls.push({ path: `/alternatives/${p.slug}`, title: `Alternatives to ${p.name}`, priority: 0.6 });
    } else {
      urls.push({ path: `/skills/${p.slug}`, title: `SKILL.md for ${p.name}`, priority: 0.7 });
    }
  }
  for (const c of allCategories()) {
    urls.push({ path: `/categories/${c.slug}`, title: c.name, priority: 0.7 });
    if (site === "people" && productsInCategory(c.slug).length) {
      urls.push({ path: `/best/${c.slug}`, title: `Best ${c.name}`, priority: 0.7 });
    }
  }
  if (site === "people") {
    for (const r of catalog.reviews.filter((x) => x.status === "published")) {
      urls.push({ path: `/reviews/${r.slug}`, title: r.title, priority: 0.5 });
    }
    for (const a of allAuthors()) {
      urls.push({ path: `/authors/${a.slug}`, title: a.name, priority: 0.5 });
    }
    for (const a of allArticles()) {
      urls.push({ path: `/blog/${a.slug}`, title: a.title, priority: 0.8 });
    }
    for (const pair of catalog.comparePairs) {
      urls.push({
        path: `/compare/${pair.a}-vs-${pair.b}`,
        title: `${pair.a} vs ${pair.b}`,
        priority: 0.7,
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

export function sitemapXml(site: SiteId, paths: UrlEntry[]): string {
  const body = paths
    .map((u) => {
      const loc = abs(site, u.path);
      const pri = u.priority ?? 0.5;
      return `  <url><loc>${loc}</loc><changefreq>weekly</changefreq><priority>${pri.toFixed(1)}</priority></url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function sitemapIndexXml(site: SiteId, files: string[]): string {
  const body = files
    .map((f) => `  <sitemap><loc>${abs(site, f)}</loc></sitemap>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}
