import { describe, expect, it } from "vitest";
import { allProducts } from "../packages/db/src/catalog";
import {
  datasetJsonLd,
  llmsTxt,
  orgJsonLd,
  pageMarkdown,
  robotsTxt,
  sitemapXml,
  softwareJsonLd,
  shouldSkipAcceptNegotiation,
} from "../packages/seo/src";
import { catalog } from "../packages/db/src/catalog";

function firstWords(text: string, n: number): string {
  const body = text.replace(/^#.*\n+/, "");
  return body.split(/\s+/).filter(Boolean).slice(0, n).join(" ");
}

describe("GEO citability", () => {
  it("home markdown answers Twin Score in the first 60 words", () => {
    const people = pageMarkdown("people", "/");
    const agents = pageMarkdown("agents", "/");
    expect(people.status).toBe(200);
    expect(firstWords(people.body, 60)).toMatch(/Twin Score/i);
    expect(firstWords(agents.body, 60)).toMatch(/Twin Score|machine-first/i);
  });

  it("product markdown leads with an X is definition", () => {
    const r = pageMarkdown("people", "/products/chatgpt");
    expect(r.status).toBe(200);
    expect(r.body).toMatch(/^# ChatGPT\n\nChatGPT is /);
  });

  it("llms.txt states Google ignores it and lists methodology", () => {
    const txt = llmsTxt("agents");
    expect(txt).toMatch(/Google Search ignores llms\.txt/);
    expect(txt).toContain("/methodology");
    expect(txt).toContain("Edu Tor");
    expect(txt).toContain("/skills/chatgpt");
    expect(txt).not.toMatch(/\{\{[A-Z_]+\}\}/);
  });

  it("robots allows AI search crawlers and does not blanket-disallow", () => {
    const txt = robotsTxt("people");
    expect(txt).toContain("User-agent: GPTBot");
    expect(txt).toContain("User-agent: OAI-SearchBot");
    expect(txt).toContain("User-agent: ClaudeBot");
    expect(txt).toContain("User-agent: PerplexityBot");
    expect(txt).not.toMatch(/User-agent: \*\nDisallow: \//);
  });

  it("sitemap xml uses lastmod and skips priority/changefreq", () => {
    const xml = sitemapXml("people", [{ path: "/", title: "Home", lastmod: "2026-08-25" }]);
    expect(xml).toContain("<lastmod>2026-08-25</lastmod>");
    expect(xml).not.toContain("<priority>");
    expect(xml).not.toContain("<changefreq>");
  });
});

describe("crawler HTML vs canvas", () => {
  it("does not treat /methodology as an /md skip", () => {
    expect(shouldSkipAcceptNegotiation("/methodology")).toBe(false);
    expect(shouldSkipAcceptNegotiation("/md")).toBe(true);
    expect(shouldSkipAcceptNegotiation("/md/products/chatgpt")).toBe(true);
    expect(shouldSkipAcceptNegotiation("/art/people-hero-3d.png")).toBe(true);
    expect(shouldSkipAcceptNegotiation("/favicon.ico")).toBe(true);
  });
});

describe("schema honesty", () => {
  it("organization has an @id and no placeholder copy", () => {
    const org = orgJsonLd("people");
    expect(org["@id"]).toContain("#organization");
    expect(JSON.stringify(org)).not.toMatch(/\{\{[A-Z_]+\}\}/);
  });

  it("dataset schema is CC BY and downloadable", () => {
    const d = datasetJsonLd();
    expect(d["@type"]).toBe("Dataset");
    expect(d.license).toContain("creativecommons.org/licenses/by/4.0");
    expect(JSON.stringify(d.distribution)).toContain("twin-scores.json");
  });

  it("software offers do not claim a fake $0 price", () => {
    const p = allProducts()[0];
    const app = softwareJsonLd("people", p, catalog.reviews.filter((r) => r.product === p.slug));
    const offers = app.offers as Record<string, unknown>;
    expect(offers.price).toBeUndefined();
    expect(offers.description).toBeTruthy();
  });
});
