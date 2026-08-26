import { describe, expect, it } from "vitest";
import { allProducts, catalog } from "../packages/db/src/catalog";
import { orgJsonLd, robotsTxt, softwareJsonLd, allCanonical, jsonLdScript } from "../packages/seo/src";
import { pageMarkdown } from "../packages/seo/src/markdown";

describe("catalog", () => {
  it("has 40-80 real products", () => {
    const n = allProducts().length;
    expect(n).toBeGreaterThanOrEqual(40);
    expect(n).toBeLessThanOrEqual(80);
  });
  it("has 6+ long articles", () => {
    expect(catalog.articles.length).toBeGreaterThanOrEqual(6);
    for (const a of catalog.articles) {
      expect(a.body.split(/\s+/).length).toBeGreaterThanOrEqual(1500);
    }
  });
});

describe("robots", () => {
  it("allows AI crawlers and has sitemap", () => {
    const txt = robotsTxt("people");
    for (const bot of ["Googlebot", "GPTBot", "ChatGPT-User", "OAI-SearchBot", "PerplexityBot", "ClaudeBot", "Google-Extended", "Applebot", "Bingbot"]) {
      expect(txt).toContain(bot);
    }
    expect(txt).toContain("Sitemap:");
    expect(txt).not.toMatch(/User-agent: \*\nDisallow: \//);
  });
});

describe("sitemap", () => {
  it("lists 200+ canonical URLs on the people site", () => {
    expect(allCanonical("people").length).toBeGreaterThanOrEqual(200);
  });
});

describe("json-ld", () => {
  it("emits organization and software application", () => {
    const org = orgJsonLd("people");
    expect(org["@type"]).toBe("Organization");
    const p = allProducts()[0];
    const app = softwareJsonLd("people", p, catalog.reviews.filter((r) => r.product === p.slug));
    expect(app["@type"]).toBe("SoftwareApplication");
    const html = jsonLdScript(app);
    expect(html).toContain("SoftwareApplication");
    expect(html).not.toContain("1000000 ratings");
  });
});

describe("markdown 404", () => {
  it("returns 404 markdown with recovery links", () => {
    const r = pageMarkdown("people", "/this-page-does-not-exist-xyz");
    expect(r.status).toBe(404);
    expect(r.body).toContain("Not found");
    expect(r.body).toContain("/products");
  });
  it("returns 410 for retired slugs", () => {
    const r = pageMarkdown("people", "/products/google-inbox");
    expect(r.status).toBe(410);
  });
});
