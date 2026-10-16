import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { abs, siblingUrl, siteUrl } from "../packages/seo/src/sites";
import { allCanonical, sitemapIndexXml, sitemapXml } from "../packages/seo/src/urls";
import { orgJsonLd } from "../packages/seo/src/jsonld";
import { apiCatalog, openApi } from "../packages/seo/src/api";
import { robotsTxt } from "../packages/seo/src/robots";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_PEOPLE_SITE_URL", undefined);
  vi.stubEnv("NEXT_PUBLIC_AGENTS_SITE_URL", undefined);
});
afterEach(() => vi.unstubAllEnvs());

describe("canonical site origins", () => {
  it("defaults both twins and generated resource origins to their existing www hosts", () => {
    expect(siteUrl("people")).toBe("https://www.buildsomethingpeoplewant.com");
    expect(siteUrl("agents")).toBe("https://www.buildsomethingagentswant.com");
    expect(siblingUrl("people")).toBe(siteUrl("agents"));
    expect(siblingUrl("agents")).toBe(siteUrl("people"));
  });

  it.each([
    ["http://localhost:4310/", "http://127.0.0.1:4311///", "http://localhost:4310", "http://127.0.0.1:4311"],
    ["https://people-preview.example.workers.dev///", "https://agents-preview.example.workers.dev/", "https://people-preview.example.workers.dev", "https://agents-preview.example.workers.dev"],
  ])("honors independent explicit local/preview bases %s and %s without trailing slashes", (people, agents, normalizedPeople, normalizedAgents) => {
    vi.stubEnv("NEXT_PUBLIC_PEOPLE_SITE_URL", people);
    vi.stubEnv("NEXT_PUBLIC_AGENTS_SITE_URL", agents);
    expect(siteUrl("people")).toBe(normalizedPeople);
    expect(siteUrl("agents")).toBe(normalizedAgents);
    expect(siblingUrl("people")).toBe(normalizedAgents);
    expect(siblingUrl("agents")).toBe(normalizedPeople);
    expect(abs("people", "/products/chatgpt")).toBe(`${normalizedPeople}/products/chatgpt`);
    expect(abs("agents", "skills/chatgpt")).toBe(`${normalizedAgents}/skills/chatgpt`);
    expect(abs("people", "")).toBe(`${normalizedPeople}/`);
    expect(orgJsonLd("people")["@id"]).toBe(`${normalizedPeople}/#organization`);
  });

  it.each(["people", "agents"] as const)("propagates the %s default into shared sitemap, robots, schema and machine discovery output", (site) => {
    const origin = site === "people" ? "https://www.buildsomethingpeoplewant.com" : "https://www.buildsomethingagentswant.com";
    expect(sitemapXml(site, allCanonical(site))).toContain(`<loc>${origin}/products/chatgpt</loc>`);
    expect(sitemapIndexXml(site, ["/sitemaps/products.xml"])).toContain(`<loc>${origin}/sitemaps/products.xml</loc>`);
    expect(robotsTxt(site)).toContain(`${origin}/sitemap.xml`);
    expect(orgJsonLd(site).url).toBe(origin);
    expect(openApi(site).servers).toEqual([{ url: `${origin}/` }]);
    expect(apiCatalog(site).linkset[0].anchor).toBe(`${origin}/api/v1/products`);
  });
});
