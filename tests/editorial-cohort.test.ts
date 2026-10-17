import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import sidecar from "../packages/db/seed/editorial-cohort-e02.json";
import { allProducts, catalog, getProduct } from "../packages/db/src/catalog";
import { COHORT_LEGACY_CONTENT_LABEL, getCohortComparison, getCohortProduct, type CohortClaim } from "../packages/seo/src/cohort";
import { resolveComparison } from "../packages/seo/src/comparisons";
import { pageMarkdown, skillMd } from "../packages/seo/src/markdown";
import { allCanonical } from "../packages/seo/src/urls";
import AgentsProduct from "../apps/agents/app/products/[slug]/page";
import Skill from "../apps/agents/app/skills/[slug]/page";
import { GET as rawSkill } from "../apps/agents/app/skills/[slug]/raw/route";
import { GET as agentsMarkdown } from "../apps/agents/app/md/[[...path]]/route";

vi.mock("@bs/ui", async () => ({
  ...await import("../packages/ui/src/twin-score"),
  ...await import("../packages/ui/src/json-ld"),
}));
const requireApp = createRequire(new URL("../apps/agents/package.json", import.meta.url));
const React = requireApp("react");
const { renderToStaticMarkup } = requireApp("react-dom/server");
beforeAll(() => vi.stubGlobal("React", React));
afterAll(() => vi.unstubAllGlobals());

const initial = structuredClone(sidecar);
const productsBefore = catalog.products;
const pairsBefore = catalog.comparePairs;
const mutable: Record<string, unknown> = sidecar;
// Fictitious test-only provenance. This never authenticates a real review and
// never reaches disk. The committed-state assertion below allows activation.
const fixtureReview = { reviewer: "test fixture reviewer", review_file: "test-fixture-only.md", reviewed_sha: "abc123de".repeat(5) };
function reviewed() {
  mutable.review_status = "reviewed";
  mutable.review = { ...fixtureReview };
}
afterEach(() => {
  Object.assign(sidecar, structuredClone(initial));
  catalog.products = productsBefore;
  catalog.comparePairs = pairsBefore;
  vi.unstubAllEnvs();
});

const slugs = ["chatgpt", "claude", "cursor", "github-copilot", "openai-platform", "anthropic-api", "supabase", "neon", "vercel", "cloudflare"];
const pairs = [
  ["chatgpt", "claude"], ["cursor", "github-copilot"], ["vercel", "cloudflare"],
  ["supabase", "neon"], ["openai-platform", "anthropic-api"],
] as const;
const paths = pairs.map(([a, b]) => `/compare/${a}-vs-${b}`);
const noncohort = allProducts().filter(p => !slugs.includes(p.slug));
const otherPairs = catalog.comparePairs.filter(p => !paths.includes(`/compare/${p.a}-vs-${p.b}`));
const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const diskSidecar = () => JSON.parse(readFileSync(new URL("../packages/db/seed/editorial-cohort-e02.json", import.meta.url), "utf8")) as typeof sidecar;
const params = (slug: string) => ({ params: Promise.resolve({ slug }) });
const md = (site: "people" | "agents", path: string) => pageMarkdown(site, path).body;
const visible = (html: string) => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const decode = (html: string) => html.replace(/&(amp|lt|gt|quot|#x27|#39);/g, entity => ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#x27;": "'", "&#39;": "'" })[entity]!);
const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function expectLimits(text: string) {
  expect(text).toMatch(/legacy editorial estimates/i);
  expect(text).toMatch(/no firsthand (?:product-)?test (?:record|log)/i);
  expect(text).not.toMatch(/assigned by named staff|using public apps and public docs|until Supabase secrets land/);
}
function expectClosed() {
  for (const slug of slugs) expect(getCohortProduct(slug), slug).toBeUndefined();
  for (const [a, b] of pairs) expect(getCohortComparison(a, b), `${a}/${b}`).toBeUndefined();
}

describe("E02 permanent fail-closed review gate", () => {
  it("accepts either valid committed state and checks its corresponding helper behavior", () => {
    expect(sidecar).toEqual(diskSidecar());
    if (sidecar.review_status === "draft") {
      expect(sidecar.review).toBeNull();
      expectClosed();
    } else {
      expect(sidecar.review_status).toBe("reviewed");
      const review = mutable.review as Record<string, unknown>;
      expect(review).toBeTruthy();
      for (const field of ["reviewer", "review_file"]) {
        expect(typeof review[field]).toBe("string");
        expect((review[field] as string).trim().length).toBeGreaterThan(0);
      }
      expect(review.reviewed_sha).toMatch(/^[0-9a-f]{40}$/);
      for (const slug of slugs) expect(getCohortProduct(slug)?.slug).toBe(slug);
      for (const [a, b] of pairs) expect(getCohortComparison(a, b)?.path).toBe(`/compare/${a}-vs-${b}`);
    }
  });

  it.each([null, fixtureReview])("blocks draft even with apparent provenance %j", review => {
    mutable.review_status = "draft";
    mutable.review = review;
    expectClosed();
  });

  it.each(["pending", "approved", "REVIEWED", "reviewed ", "", null, undefined, true, 1])("blocks invalid state %j", status => {
    mutable.review_status = status;
    mutable.review = fixtureReview;
    expectClosed();
  });

  it.each([null, undefined, "review", [], 1, true, {}])("blocks reviewed with malformed provenance %j", review => {
    mutable.review_status = "reviewed";
    mutable.review = review;
    expectClosed();
  });

  it.each(["reviewer", "review_file"])("requires a nonempty string for %s", field => {
    for (const value of [undefined, null, "", " \n\t ", 1, true, [], {}]) {
      reviewed();
      mutable.review = { ...fixtureReview, [field]: value };
      expectClosed();
    }
  });

  it.each([undefined, null, "", "a".repeat(39), "a".repeat(41), "A".repeat(40), "g".repeat(40), " " + "a".repeat(40), "a".repeat(40) + "\n", 1, true, []])("requires exact lowercase 40-hex reviewed SHA %j", sha => {
    reviewed();
    mutable.review = { ...fixtureReview, reviewed_sha: sha };
    expectClosed();
  });

  it("accepts nonblank reviewer strings after trim without inventing a human editor", () => {
    reviewed();
    mutable.review = { ...fixtureReview, reviewer: " fixture reviewer ", review_file: " fixture.md\n" };
    expect(getCohortProduct("chatgpt")?.responsible_human_editor).toBeNull();
    expect(getCohortComparison("chatgpt", "claude")?.responsible_human_editor).toBeNull();
  });
});

describe("E02 exact published membership and canonical comparison policy", () => {
  it.each(slugs)("returns the documented %s dossier only in a reviewed fixture", slug => {
    reviewed();
    const result = getCohortProduct(slug);
    expect(result?.slug).toBe(slug);
    expect(result?.claims.length).toBeGreaterThan(1);
    expect(result?.people.decision_checks.length).toBeGreaterThan(0);
    expect(result?.agents.preflight.length).toBeGreaterThan(0);
    expect(result?.agents.stop_conditions.length).toBeGreaterThan(0);
    expect(result).toMatchObject({ checked_on: "2026-10-17", method: "documentation review", researcher: "automated agent", responsible_human_editor: null, product_tested: false });
    expect(result?.sources.map(s => s.id)).toEqual(expect.arrayContaining(result!.claims.flatMap(c => c.source_ids)));
  });

  it.each(pairs)("accepts only the existing resolved %s vs %s canonical dossier", (a, b) => {
    reviewed();
    const path = `/compare/${a}-vs-${b}`;
    expect(resolveComparison(`${a}-vs-${b}`)).toMatchObject({ kind: "page", path, indexable: true });
    const dossier = getCohortComparison(a, b);
    expect(dossier).toMatchObject({ a, b, path, responsible_human_editor: null, product_tested: false });
    expect(dossier!.claims.length).toBeGreaterThan(1);
    for (const row of dossier!.rows) for (const id of [...row.a_claim_ids, ...row.b_claim_ids]) expect(dossier!.claims.some(c => c.id === id)).toBe(true);
    expect(resolveComparison(`${b}-vs-${a}`)).toEqual({ kind: "redirect", path });
    expect(getCohortComparison(b, a)).toBeUndefined();
  });

  it.each(noncohort)("excludes published noncohort $slug", product => {
    reviewed();
    expect(getCohortProduct(product.slug)).toBeUndefined();
  });

  it.each(otherPairs)("excludes noncohort curated $a vs $b", ({ a, b }) => {
    reviewed();
    expect(resolveComparison(`${a}-vs-${b}`)).toMatchObject({ kind: "page", indexable: true });
    expect(getCohortComparison(a, b)).toBeUndefined();
    expect(getCohortComparison(b, a)).toBeUndefined();
  });

  it("covers all 62 other products, 20 other pairs and the four cohort-member curated negatives", () => {
    expect(noncohort).toHaveLength(62);
    expect(otherPairs).toHaveLength(20);
    expect(otherPairs.map(p => `${p.a}-vs-${p.b}`)).toEqual(expect.arrayContaining(["perplexity-vs-chatgpt", "vercel-vs-netlify", "supabase-vs-firebase", "aws-vs-cloudflare"]));
  });

  it.each(["draft", "hidden"] as const)("rejects %s cohort entities in either comparison operand", status => {
    reviewed();
    for (const slug of slugs) {
      catalog.products = productsBefore.map(p => p.slug === slug ? { ...p, status } : p);
      expect(getCohortProduct(slug)).toBeUndefined();
      for (const [a, b] of pairs.filter(([a, b]) => a === slug || b === slug)) expect(getCohortComparison(a, b)).toBeUndefined();
    }
  });

  it("rejects orphaned dossiers, removed curation and changed canonical orientation", () => {
    reviewed();
    catalog.products = productsBefore.filter(p => p.slug !== "claude");
    expect(getCohortProduct("claude")).toBeUndefined();
    expect(getCohortComparison("chatgpt", "claude")).toBeUndefined();
    catalog.products = productsBefore;
    catalog.comparePairs = pairsBefore.filter(p => !(p.a === "chatgpt" && p.b === "claude"));
    expect(resolveComparison("chatgpt-vs-claude")).toMatchObject({ kind: "page", indexable: false });
    expect(getCohortComparison("chatgpt", "claude")).toBeUndefined();
    catalog.comparePairs = pairsBefore.map(p => p.a === "chatgpt" && p.b === "claude" ? { ...p, a: p.b, b: p.a } : p);
    expect(getCohortComparison("chatgpt", "claude")).toBeUndefined();
    expect(getCohortComparison("claude", "chatgpt")).toBeUndefined();
  });

  it("retains chatgpt-vs-cursor as an uncurated 200/noindex page without a dossier", () => {
    reviewed();
    expect(resolveComparison("chatgpt-vs-cursor")).toMatchObject({ kind: "page", indexable: false });
    expect(pageMarkdown("people", "/compare/chatgpt-vs-cursor")).toMatchObject({ status: 200, robots: "noindex, follow" });
    expect(getCohortComparison("chatgpt", "cursor")).toBeUndefined();
  });

  it.each(["", "unknown-e02", "ChatGPT", " chatgpt", "chatgpt?reviewed=1", "/products/chatgpt", "chatgpt-vs-claude", "__proto__", "constructor", "toString"])("rejects malformed or unknown slug %s", slug => {
    reviewed();
    expect(getCohortProduct(slug)).toBeUndefined();
    expect(getCohortComparison(slug, "claude")).toBeUndefined();
    expect(getCohortComparison("chatgpt", slug)).toBeUndefined();
  });

  it.each(slugs)("rejects self-comparison %s", slug => {
    reviewed();
    expect(getCohortComparison(slug, slug)).toBeUndefined();
  });

  it("returns undefined for a missing or inconsistent stored dossier instead of synthesizing one", () => {
    reviewed();
    const products = sidecar.products as Record<string, unknown>;
    delete products.chatgpt;
    expect(getCohortProduct("chatgpt")).toBeUndefined();
    expect(getCohortComparison("chatgpt", "claude")).toBeUndefined();
    Object.assign(sidecar, structuredClone(initial));
    reviewed();
    sidecar.products.chatgpt.slug = "claude";
    expect(getCohortProduct("chatgpt")).toBeUndefined();
    Object.assign(sidecar, structuredClone(initial));
    reviewed();
    const comparisons = sidecar.comparisons as Record<string, unknown>;
    delete comparisons[paths[0]];
    expect(getCohortComparison("chatgpt", "claude")).toBeUndefined();
    Object.assign(sidecar, structuredClone(initial));
    reviewed();
    sidecar.comparisons["/compare/chatgpt-vs-claude"].path = "/compare/claude-vs-chatgpt";
    expect(getCohortComparison("chatgpt", "claude")).toBeUndefined();
  });
});

describe("E02 documentary evidence and protected data boundary", () => {
  it("pins exact membership, canonical paths, groups and the four protected hashes", () => {
    expect(Object.keys(sidecar.products)).toEqual(slugs);
    expect(Object.keys(sidecar.comparisons)).toEqual(paths);
    expect(sidecar.groups.map(g => [g.id, g.products])).toEqual([["H1", slugs.slice(0, 6)], ["H2", slugs.slice(6)]]);
    expect(sidecar.source_sha).toBe("2e294a91503310a77ec54b6e4ffd5b80ba904351");
    const protectedFiles = {
      "packages/db/seed/catalog.json": "f12a2d2efd1704aef5273c735a5e2a72bb6b5b161ef4d2dc93095d9035d3414a",
      "packages/db/seed/evidence.json": "fa100dd4906e35fc1fc4a0d84b0f6d50dd68d45de295619149dd91c39fe10fab",
      "tests/fixtures/e01-repair-manifest.json": "da022b6986eccbec878f96928cc164d14537b2e112463e179daf52f544c6d16f",
      "tests/fixtures/e01f-repair-manifest.json": "da51354c68d1df4d245fb9f4383b7981c033f453c48faa3b28753dd06a9f570a",
    };
    for (const [path, digest] of Object.entries(protectedFiles)) expect(hash(readFileSync(new URL(`../${path}`, import.meta.url))), path).toBe(digest);
  });

  it("resolves documented claims only to the 20 retrieved primary sources and preserves unknown scope", () => {
    expect(sidecar.sources).toHaveLength(20);
    expect(new Set(sidecar.sources.map(s => s.id)).size).toBe(20);
    expect(sidecar.sources.map(s => s.id)).toEqual(Array.from({ length: 21 }, (_, i) => `S${String(i + 1).padStart(2, "0")}`).filter(id => id !== "S08"));
    const sources = new Map(sidecar.sources.map(s => [s.id, s]));
    for (const source of sidecar.sources) {
      expect(source.url).toMatch(/^https:\/\//);
      expect(source.retrieval_status).toBe("retrieved");
      expect(source.checked_on).toBe("2026-10-17");
      expect(source.method).toBe("documentation review");
      expect(source.limitations.length).toBeGreaterThan(20);
      expect(source.rights.length).toBeGreaterThan(20);
    }
    const claims: CohortClaim[] = [
      ...Object.values(sidecar.products).flatMap(p => p.claims),
      ...sidecar.groups.flatMap(g => g.claims), ...sidecar.editorial_claims,
    ] as CohortClaim[];
    expect(new Set(claims.map(c => c.id)).size).toBe(claims.length);
    for (const claim of claims) {
      expect(claim.id).toMatch(/^E02-/);
      expect(claim.checked_on).toBe("2026-10-17");
      expect(claim.scope.length).toBeGreaterThan(10);
      expect(claim.version.length).toBeGreaterThan(5);
      expect(claim.limitations.length).toBeGreaterThan(20);
      expect(["documented", "unknown"]).toContain(claim.evidence_status);
      if (claim.evidence_status === "documented") expect(claim.source_ids.length).toBeGreaterThan(0);
      else expect(claim.source_ids).toEqual([]);
      for (const id of claim.source_ids) expect(sources.has(id), `${claim.id}/${id}`).toBe(true);
    }
    for (const p of Object.values(sidecar.products)) {
      expect(p.claims.filter(c => c.evidence_status === "unknown")).toHaveLength(1);
      expect(p.source_ids.slice().sort()).toEqual([...new Set(p.claims.flatMap(c => c.source_ids))].sort());
    }
    expect(sidecar.responsible_human_editor).toBeNull();
    expect(sidecar.product_tested).toBe(false);
    expect(sidecar.limits.join(" ")).toContain("not proof that a feature is absent");
    expect(sidecar.limits.join(" ")).toContain("No source material is relicensed");
    expect(sidecar.limits.join(" ")).toContain("ODbL/DbCL");
  });

  it("keeps provider, version, credential and temporal distinctions instead of implying tested capabilities", () => {
    const text = (slug: keyof typeof sidecar.products) => JSON.stringify(sidecar.products[slug]);
    expect(text("cursor")).toContain("https://api.cursor.com/v1/agents");
    expect(text("cursor")).toMatch(/v1.*forthcoming.*v0/);
    expect(text("github-copilot")).toMatch(/GitHub MCP server.*current-repository context by default.*additional MCP servers/);
    expect(text("github-copilot")).toContain("does not document an MCP endpoint for external agents");
    expect(text("github-copilot")).toContain("not re-evaluated");
    expect(text("anthropic-api")).toContain("https://api.anthropic.com/v1/messages");
    expect(text("anthropic-api")).toContain("required with multi-workspace keys, optional with single-workspace keys and not used with WIF tokens");
    expect(text("anthropic-api")).toContain("detailed Messages parameter schema was not retrieved");
    expect(text("supabase")).toContain("Re-check before activation");
    expect(text("supabase")).toContain("by the end of 2026");
    expect(text("neon")).toContain("Launch and Scale Backend lists");
    expect(text("cloudflare")).toContain("do not prove this app fits Free");
    expect(sidecar.groups[1].claims[0].limitations).toContain("base is not stated");
  });

  it("resolves related links to existing canonical pages without growing the URL inventory", () => {
    const before = [allCanonical("people"), allCanonical("agents")];
    reviewed();
    const existing = new Set(before[0].map(row => row.path));
    for (const dossier of [...Object.values(sidecar.products), ...Object.values(sidecar.comparisons)]) {
      for (const path of dossier.related_paths) expect(existing.has(path), path).toBe(true);
    }
    expect([allCanonical("people"), allCanonical("agents")]).toEqual(before);
  });

  it("defines the one byte-exact shared inherited-content label", () => {
    expect(COHORT_LEGACY_CONTENT_LABEL).toBe("Catalog fields on this page (description, founded, headquarters, pricing, Twin Scores, capability grades) are retained catalog content. Only statements dated 2026-10-16 (E01 evidence register) or carrying an E02 claim ID were documentation-checked; everything else is unverified.");
  });

  it("mutates fixtures only in memory and leaves the disk sidecar unchanged", () => {
    const before = readFileSync(new URL("../packages/db/seed/editorial-cohort-e02.json", import.meta.url));
    reviewed();
    expect(getCohortProduct("chatgpt")).toBeDefined();
    expect(readFileSync(new URL("../packages/db/seed/editorial-cohort-e02.json", import.meta.url))).toEqual(before);
  });
});

// C1/C2 are permanent rehearsals with the gate OPEN in memory. The later
// representation slice must extend this same file with positive dossier/label
// parity assertions; these protections must still hold once renderers use it.
describe("C1/C2 reviewed-fixture rehearsal of protected cohort representations", () => {
  it.each(slugs)("preserves %s product lead, answer-first baseline, skill frontmatter and limits", slug => {
    reviewed();
    expect(getCohortProduct(slug)?.slug).toBe(slug);
    const p = getProduct(slug)!;
    for (const site of ["people", "agents"] as const) {
      const body = md(site, `/products/${slug}`);
      expect(body.startsWith(`# ${p.name}\n\n${p.longDescription}\n\n`)).toBe(true);
      if (p.longDescription.startsWith(`${p.name} is `)) expect(body).toMatch(new RegExp(`^# ${escapeRegex(p.name)}\n\n${escapeRegex(p.name)} is `));
      expectLimits(body);
    }
    const skill = skillMd(slug);
    expect(skill.startsWith(`---\nname: ${slug}\n`)).toBe(true);
    expect(skill).toContain(`\n---\n\n# ${p.name} skill\n\n${p.longDescription}\n\n`);
    expectLimits(skill);
  });

  it.each(pairs)("preserves %s vs %s heading, original lead and shared limitations", (a, b) => {
    reviewed();
    expect(getCohortComparison(a, b)).toBeDefined();
    const pair = pairsBefore.find(p => p.a === a && p.b === b)!;
    const body = md("people", `/compare/${a}-vs-${b}`);
    expect(body.startsWith(`# ${getProduct(a)!.name} vs ${getProduct(b)!.name}\n\n${pair.intro}\n\n`)).toBe(true);
    expectLimits(body);
  });

  it("preserves the actual Agents cursor grades, exact disclosure, Auth and absence of a named editor", async () => {
    reviewed();
    expect(getCohortProduct("cursor")).toBeDefined();
    const p = getProduct("cursor")!;
    const text = visible(renderToStaticMarkup(await AgentsProduct(params(p.slug))));
    expect(text).toContain("Legacy capability grades, not re-evaluated by this audit");
    expect(text).not.toContain("Named editor:");
    expect(text).toContain(`Catalog score date ${p.twin.updated}`);
    expect(text).toContain(`Human ${p.twin.human} Agent ${p.twin.agent}`);
    for (const value of [p.capabilities.api, p.capabilities.mcp, p.capabilities.cli, p.capabilities.docs, p.capabilities.auth]) expect(text).toContain(value);
    expect(text).toContain(`Auth: ${p.capabilities.auth}`);
    expectLimits(text);
  });

  it.each(slugs)("keeps %s raw, negotiated Markdown and HTML pre byte-identical to skillMd", async slug => {
    reviewed();
    expect(getCohortProduct(slug)).toBeDefined();
    const expected = skillMd(slug);
    expect(pageMarkdown("agents", `/skills/${slug}`)).toMatchObject({ status: 200, body: expected });
    const raw = await rawSkill(new Request("http://localhost/"), params(slug));
    expect(raw.status).toBe(200);
    expect(await raw.text()).toBe(expected);
    const response = await agentsMarkdown(new Request(`http://localhost/md/skills/${slug}`), { params: Promise.resolve({ path: ["skills", slug] }) });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(expected);
    const html = renderToStaticMarkup(await Skill(params(slug)));
    expect(decode(html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/)![1])).toBe(expected);
  });
});
