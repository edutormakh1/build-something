import { createRequire } from "node:module";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { allProducts, getProduct, productsInCategory } from "../packages/db/src/catalog";
import { abs } from "../packages/seo/src/sites";

vi.mock("@bs/ui", async () => ({
  ...await import("../packages/ui/src/motion/tone"),
  ...await import("../packages/ui/src/twin-score"),
  ...await import("../packages/ui/src/json-ld"),
}));
const requireApp = createRequire(new URL("../apps/agents/package.json", import.meta.url));
const React = requireApp("react");
const { renderToStaticMarkup } = requireApp("react-dom/server");
beforeAll(() => vi.stubGlobal("React", React));
afterAll(() => vi.unstubAllGlobals());
const visible = (html: string) => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

async function staticPage(path: string) {
  const pages = {
    "/": () => import("../apps/agents/app/page"),
    "/about": () => import("../apps/agents/app/about/page"),
    "/methodology": () => import("../apps/agents/app/methodology/page"),
    "/scorecard": () => import("../apps/agents/app/scorecard/page"),
    "/api": () => import("../apps/agents/app/api/page"),
    "/for-agents": () => import("../apps/agents/app/for-agents/page"),
  };
  const pageModule = await pages[path as keyof typeof pages]();
  return { html: renderToStaticMarkup(React.createElement(pageModule.default)), pageModule };
}

describe("Agents public editorial disclosures", () => {
  it.each(["/", "/about", "/methodology", "/scorecard", "/api", "/for-agents"])("renders real %s limits and preserves its selfcanonical", async path => {
    const { html, pageModule } = await staticPage(path);
    const text = visible(html);
    expect(text).toMatch(/legacy editorial estimates/i);
    expect(text).toMatch(/no firsthand product-test log or per-dimension scoring worksheet/i);
    expect(text).toMatch(/documentation checks.*do not validate the scores/i);
    expect(text).toMatch(/agent documentation review dated 2026-10-16/i);
    expect(text).toMatch(/responsible human editor unassigned/i);
    expect(text).not.toMatch(/Named staff assign|Who: Edu Tor \(editor\), with staff writers|Recompute from the rubric/);
    expect(pageModule.metadata.alternates?.canonical).toBe(abs("agents", path));
  });

  it.each(["/", "/about", "/methodology"])("qualifies catalog bylines on %s rather than asserting employment or firsthand evaluation", async path => {
    const text = visible((await staticPage(path)).html);
    expect(text).toContain("Edu Tor");
    expect(text).toContain("Maya Chen");
    expect(text).toContain("Jonas Okonkwo");
    expect(text).toMatch(/professional history and firsthand product evaluations are not independently verified/i);
    expect(text).toMatch(/catalog attributions|bylines.*catalog/i);
  });

  it("keeps the actual product estimates, grades, catalog date and canonical while labeling their provenance", async () => {
    const pageModule = await import("../apps/agents/app/products/[slug]/page");
    const product = getProduct("cursor")!;
    const params = Promise.resolve({ slug: product.slug });
    const html = renderToStaticMarkup(await pageModule.default({ params }));
    const text = visible(html);
    expect(text).toContain(`Catalog score date ${product.twin.updated}`);
    expect(text).toContain(`Human ${product.twin.human} Agent ${product.twin.agent}`);
    expect(text).toMatch(/legacy editorial estimates; no firsthand test record attached/i);
    expect(text).toMatch(/catalog attribution/i);
    expect(text).not.toContain("Named editor:");
    expect(text).toContain("Legacy capability grades, not re-evaluated by this audit");
    for (const value of [product.capabilities.api, product.capabilities.mcp, product.capabilities.cli, product.capabilities.docs, product.capabilities.auth]) expect(text).toContain(value);
    expect(html).toContain(`href="${abs("people", `/products/${product.slug}`)}"`);
    expect(html).toContain(`href="${product.website}"`);
    const metadata = await pageModule.generateMetadata({ params });
    expect(metadata.alternates?.canonical).toBe(abs("agents", `/products/${product.slug}`));
    expect(metadata.description).toContain(String(product.twin.agent));
    const schemas = Array.from(html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)).flatMap(match => JSON.parse(match[1]));
    expect(schemas.some(node => node["@type"] === "SoftwareApplication")).toBe(true);
    expect(schemas.some(node => node.aggregateRating || node["@type"] === "AggregateRating")).toBe(false);
  });

  it("shows the direct category estimate limitation before its unchanged list, including zero", async () => {
    const pageModule = await import("../apps/agents/app/categories/[slug]/page");
    const product = getProduct("chatgpt")!;
    const original = product.twin.agent;
    try {
      product.twin.agent = 0;
      const params = Promise.resolve({ slug: product.category });
      const html = renderToStaticMarkup(await pageModule.default({ params }));
      const text = visible(html);
      expect(text).toMatch(/legacy editorial estimates; no firsthand test record attached/i);
      expect(html.indexOf("Legacy editorial estimates")).toBeLessThan(html.indexOf("<ul>"));
      for (const row of productsInCategory(product.category)) {
        expect(text).toContain(`${row.name} · agent ${row.twin.agent}`);
        expect(html).toContain(`href="/products/${row.slug}"`);
      }
      expect(text).toContain(`${product.name} · agent 0`);
      expect((await pageModule.generateMetadata({ params })).alternates?.canonical).toBe(abs("agents", `/categories/${product.category}`));
    } finally { product.twin.agent = original; }
  });

  it("retains home ordering/values and explains what the exported estimates can reproduce", async () => {
    const { html } = await staticPage("/");
    const expected = allProducts().slice().sort((a, b) => b.twin.agent - a.twin.agent).slice(0, 12);
    const links = Array.from(html.matchAll(/href="(\/products\/[^"?]+)"/g), match => match[1]);
    expect(links).toEqual(expected.map(product => `/products/${product.slug}`));
    for (const path of ["/", "/methodology", "/scorecard", "/api", "/for-agents"]) {
      const text = visible((await staticPage(path)).html);
      expect(text).toMatch(/summaries|gaps/);
      expect(text).toMatch(/not.*original scoring observations/);
    }
  });
});
