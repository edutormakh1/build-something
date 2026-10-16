import { describe, expect, it } from "vitest";
import catalog from "../packages/db/seed/catalog.json";

const published = catalog.products.filter((product) => product.status === "published");
const body = (slug: string) => catalog.articles.find((article) => article.slug === slug)!.body;
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const aliases: Record<string, string> = {
  "AI assistants": "ai-assistants", "Developer tools": "developer-tools", Design: "design",
  Productivity: "productivity", Infrastructure: "infrastructure", Automation: "automation",
  "Marketing and CRM": "marketing", Communications: "communications", Payments: "payments", "Data and analytics": "data",
};
const number = (text: string) => Number(text.replace("−", "-"));

describe("editorial arithmetic from preserved estimates", () => {
  it.each(["human-vs-agent-software-surfaces-2026", "how-twin-score-rubric-works"])("reproduces each actual category-table row in %s using only primary membership", (slug) => {
    const table = body(slug).split("\n\n").find((block) => block.startsWith("| Category |"))!;
    const rows = table.split("\n").slice(2).map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
    expect(rows).toHaveLength(catalog.categories.length);
    const seen = new Set<string>();
    for (const row of rows) {
      const category = aliases[row[0]] || row[0];
      expect(seen.has(category)).toBe(false);
      seen.add(category);
      const products = published.filter((product) => product.category === category);
      expect(products.length).toBeGreaterThan(0);
      expect(number(row[1])).toBe(products.length);
      const human = mean(products.map((product) => product.twin.human));
      const agent = mean(products.map((product) => product.twin.agent));
      expect(row[2]).toBe(human.toFixed(2));
      expect(row[3]).toBe(agent.toFixed(2));
      if (row.length === 6) {
        expect(number(row[4])).toBe(Number((human - agent).toFixed(2)));
        expect(row[4]).toMatch(/^[+−]\d+\.\d{2}$/);
      }
    }
    expect([...seen].sort()).toEqual(catalog.categories.map((category) => category.slug).sort());
  });

  it("checks median/sign counts and the concluding design takeaway against the same inputs, not the mean", () => {
    const gaps = published.map((product) => product.twin.human - product.twin.agent).sort((a, b) => a - b);
    const median = mean(gaps.slice(gaps.length / 2 - 1, gaps.length / 2 + 1));
    expect(median).toBe(-2);
    expect(gaps.filter((gap) => gap > 0)).toHaveLength(34);
    expect(gaps.filter((gap) => gap < 0)).toHaveLength(38);
    const article = body("human-vs-agent-software-surfaces-2026");
    const observedMedian = article.match(/median human-minus-agent score is ([−\d]+)/)!;
    expect(number(observedMedian[1])).toBe(median);
    const signs = article.match(/(\d+) products have a positive gap and (\d+) a negative gap/)!;
    expect(number(signs[1])).toBe(gaps.filter((gap) => gap > 0).length);
    expect(number(signs[2])).toBe(gaps.filter((gap) => gap < 0).length);
    const design = published.filter((product) => product.category === "design");
    expect(design).toHaveLength(9);
    const conclusion = article.split("## Related reading on this site")[1].split("## Catalog notes")[0];
    const designValue = conclusion.match(/mean retained human-minus-agent estimate is ([+−]?\d+(?:\.\d+)?)/)!;
    expect(number(designValue[1])).toBe(Number(mean(design.map((product) => product.twin.human - product.twin.agent)).toFixed(2)));
    expect(conclusion).toContain("nine design products");
    expect(conclusion).toContain("curated editorial sample");
    expect(conclusion).not.toContain("gap of +22");
    expect(conclusion).not.toContain("software industry in a number");
  });

  it("limits category conclusions by membership and preserves both rubric totals", () => {
    const grouped = catalog.categories.map((category) => {
      const products = published.filter((product) => product.category === category.slug);
      return { slug: category.slug, n: products.length, gap: mean(products.map((product) => product.twin.human - product.twin.agent)) };
    }).sort((a, b) => a.gap - b.gap);
    expect(grouped[0]).toEqual({ slug: "payments", n: 1, gap: -12 });
    const infrastructure = grouped.find((group) => group.slug === "infrastructure")!;
    for (const slug of ["how-twin-score-rubric-works", "twin-score-gap-table-2026"]) {
      const text = body(slug).split("## Catalog notes")[0];
      expect(number(text.match(/infrastructure is ([−\d.]+)\./)![1])).toBe(Number(infrastructure.gap.toFixed(2)));
      expect(text).toContain("with one catalog member");
      expect(text).toContain("do not establish a market-wide comparison");
    }
    for (const dimensions of [catalog.rubric.human, catalog.rubric.agent]) expect(dimensions.reduce((sum, dimension) => sum + dimension.weight, 0)).toBe(100);
  });

  it("keeps factual main-matrix Auth repairs separate from unchanged ordinal grades and numerical scores", () => {
    const table = body("agent-capability-matrix-2026").split("\n\n").find((block) => block.startsWith("| Product |"))!;
    const rows = table.split("\n").slice(2).map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
    for (const slug of ["cursor", "supabase"]) {
      const product = published.find((product) => product.slug === slug)!;
      const row = rows.find((row) => row[0] === product.name)!;
      expect(row.slice(1, 5)).toEqual([product.capabilities.api, product.capabilities.mcp, product.capabilities.cli, product.capabilities.docs]);
      expect(number(row[6])).toBe(product.twin.agent);
      if (slug === "cursor") expect(row[5]).toMatch(/user\/service-account API key.*Basic\/Bearer/);
      else expect(row[5]).toMatch(/publishable key.*secret key.*bypasses RLS.*legacy anon\/service_role.*user JWTs/);
    }
    const narrative = body("human-vs-agent-software-surfaces-2026").split("## What changed in 2026")[1].split("## How to use")[0];
    expect(narrative).toMatch(/Cursor documents a Cloud Agents API.*GitHub documents a Copilot cloud agent/);
    expect(narrative).toContain("No comparative task run");
    expect(narrative).not.toContain("Cursor is closer to an operator");
  });
});
