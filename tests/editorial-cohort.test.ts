import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import sidecar from "../packages/db/seed/editorial-cohort-e02.json";
import { allProducts, catalog, getProduct } from "../packages/db/src/catalog";
import { COHORT_LEGACY_CONTENT_LABEL, getCohortComparison, getCohortProduct, type CohortClaim, type CohortProduct, type CohortComparison } from "../packages/seo/src/cohort";
import { resolveComparison } from "../packages/seo/src/comparisons";
import { pageMarkdown, skillMd } from "../packages/seo/src/markdown";
import { allCanonical } from "../packages/seo/src/urls";
import AgentsProduct, { generateMetadata as agentsMetadata, generateStaticParams as agentsParams } from "../apps/agents/app/products/[slug]/page";
import PeopleProduct, { generateMetadata as peopleMetadata, generateStaticParams as peopleParams } from "../apps/people/app/products/[slug]/page";
import Compare, { generateMetadata as compareMetadata, generateStaticParams as compareParams } from "../apps/people/app/compare/[pair]/page";
import Skill from "../apps/agents/app/skills/[slug]/page";
import { GET as rawSkill } from "../apps/agents/app/skills/[slug]/raw/route";
import { GET as agentsMarkdown } from "../apps/agents/app/md/[[...path]]/route";

vi.mock("@bs/ui", async () => ({
  ...await import("../packages/ui/src/twin-score"),
  ...await import("../packages/ui/src/json-ld"),
  ...await import("../packages/ui/src/breadcrumbs"),
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
    const supabaseLimitation = sidecar.products.supabase.claims.find(claim => claim.id === "E02-supabase-C02")!.limitations;
    expect(supabaseLimitation).toBe("Status as documented on 2026-10-17; check the current Supabase API-key page before relying on legacy anon/service_role keys. No failure, revocation, key rotation or migration was observed.");
    expect(sidecar.products.supabase.agents.preflight[2]).toBe("Check the current Supabase API-key page for legacy-key deprecation status before relying on anon/service_role keys.");
    expect(text("supabase")).toContain("by the end of 2026");
    expect(text("neon")).toContain("Launch and Scale Backend lists");
    const cloudflareLimitation = sidecar.products.cloudflare.claims.find(claim => claim.id === "E02-cloudflare-C01")!.limitations;
    expect(cloudflareLimitation).toContain("advertised allowances alone do not establish a deployment's suitability for Workers Free");
    expect(cloudflareLimitation).toContain("rendered HTML is not automatically a direct static asset");
    expect(cloudflareLimitation).toContain("No traffic, account tier or CPU was measured");
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

const neutralMcp = "See the cohort dossier and its limits for documented MCP roles and access scope. Legacy capability grades do not establish a callable external MCP endpoint.";
const pairParams = (a: string, b: string) => ({ params: Promise.resolve({ pair: `${a}-vs-${b}` }) });
const renderProduct = async (site: "people" | "agents", slug: string) => renderToStaticMarkup(await (site === "people" ? PeopleProduct : AgentsProduct)(params(slug))) as string;
const renderComparison = async (a: string, b: string) => renderToStaticMarkup(await Compare(pairParams(a, b))) as string;
const section = (html: string) => html.match(/<section aria-label="Documentation dossier">([\s\S]*?)<\/section>/)?.[1] ?? "";
function labelCount(body: string, count: number) {
  // Full exact string, without normalizing whitespace, punctuation or case.
  expect(body.split(COHORT_LEGACY_CONTENT_LABEL).length - 1).toBe(count);
}
function expectDossier(body: string, dossier: CohortProduct | CohortComparison) {
  expect(body).toContain("Responsible human editor: unassigned");
  expect(body).toContain("Researcher: automated agent");
  expect(body).toContain("Method: documentation review");
  expect(body).toContain(`Checked: ${dossier.checked_on}`);
  expect(body).toContain("Product not tested");
  expect(body).not.toMatch(/test fixture reviewer|test-fixture-only|reviewed_sha|review_status|Named editor:/);
  for (const claim of dossier.claims) {
    for (const field of [claim.id, claim.statement, claim.evidence_status, claim.scope, claim.version, claim.checked_on, claim.limitations]) expect(body, `${claim.id}: ${field}`).toContain(field);
  }
  for (const source of dossier.sources) {
    expect(body).toContain(source.id);
    expect(body).toContain(source.url);
  }
}
async function productOutputs(slug: string) {
  const raw = await rawSkill(new Request("http://localhost/"), params(slug));
  const skillHtml = renderToStaticMarkup(await Skill(params(slug))) as string;
  return [await renderProduct("people", slug), await renderProduct("agents", slug), md("people", `/products/${slug}`), md("agents", `/products/${slug}`), skillMd(slug), skillHtml, await raw.text()];
}

describe("E02 actual reviewed dossier consumers", () => {
  it.each(slugs)("renders all %s claims, sources and distinct audience decisions on real HTML/MD/skill consumers", async slug => {
    reviewed();
    const dossier = getCohortProduct(slug)!;
    const peopleHtml = await renderProduct("people", slug), agentsHtml = await renderProduct("agents", slug);
    const peopleMd = md("people", `/products/${slug}`), agentsMd = md("agents", `/products/${slug}`), skill = skillMd(slug);
    for (const body of [decode(peopleHtml), decode(agentsHtml), peopleMd, agentsMd, skill]) {
      labelCount(body, 1);
      expectDossier(body, dossier);
    }
    expect(section(peopleHtml)).not.toBe("");
    expect(section(agentsHtml)).not.toBe("");
    for (const body of [decode(section(peopleHtml)), peopleMd]) {
      expect(body).toContain(dossier.people.question);
      for (const check of dossier.people.decision_checks) expect(body).toContain(check);
      expect(body).not.toContain(dossier.agents.stop_conditions[0]);
    }
    for (const body of [decode(section(agentsHtml)), agentsMd, skill]) {
      expect(body).toContain(dossier.agents.surface);
      for (const item of [...dossier.agents.preflight, ...dossier.agents.stop_conditions]) expect(body).toContain(item);
      expect(body).not.toContain(dossier.people.question);
    }
    expect(peopleHtml.indexOf(COHORT_LEGACY_CONTENT_LABEL)).toBeLessThan(peopleHtml.indexOf('<header class="piece-head">'));
    expect(agentsHtml.indexOf(COHORT_LEGACY_CONTENT_LABEL)).toBeLessThan(agentsHtml.indexOf('<header class="piece-head">'));
    expect(peopleHtml.indexOf('<section aria-label="Documentation dossier">')).toBeGreaterThan(peopleHtml.indexOf("Twin page for agents:"));
    expect(peopleHtml.indexOf('</section>')).toBeLessThan(peopleHtml.indexOf('<h2>Capability matrix</h2>'));
    expect(agentsHtml.indexOf('<section aria-label="Documentation dossier">')).toBeGreaterThan(agentsHtml.indexOf("Meaning is in this HTML"));
    expect(agentsHtml.indexOf('</section>')).toBeLessThan(agentsHtml.indexOf('<h2>API / MCP / CLI / docs / auth</h2>'));
    for (const source of dossier.sources) for (const html of [peopleHtml, agentsHtml]) expect(html).toContain(`href="${source.url.replace(/&/g, "&amp;")}"`);
    for (const path of dossier.related_paths) {
      expect(peopleMd).toContain(`](${path})`);
      expect(peopleHtml).toContain(`href="${path}"`);
      const agentPath = path.startsWith("/compare/") ? `https://www.buildsomethingpeoplewant.com${path}` : path;
      for (const body of [agentsMd, skill]) expect(body).toContain(`](${agentPath})`);
      expect(agentsHtml).toContain(`href="${agentPath}"`);
    }
    expect(decode(agentsHtml)).toContain(neutralMcp);
    expect(skill).toContain(neutralMcp);
    expect(visible(agentsHtml)).toContain(`Auth: ${getProduct(slug)!.capabilities.auth}`);
    expect(visible(agentsHtml)).not.toContain(`MCP is ${getProduct(slug)!.capabilities.mcp}.`);
    expect(skill).not.toContain("Do not claim an MCP server exists unless the capability matrix says so");
    const raw = await rawSkill(new Request("http://localhost/"), params(slug));
    const pre = renderToStaticMarkup(await Skill(params(slug))) as string;
    labelCount(decode(pre), 1);
    for (const body of [await raw.text(), decode(pre.match(/<pre[^>]*>([\s\S]*?)<\/pre>/)![1]), pageMarkdown("agents", `/skills/${slug}`).body]) {
      labelCount(body, 1); expectDossier(body, dossier); expect(body).toBe(skill);
    }
  });

  it.each(pairs)("renders %s vs %s as a documentary decision table with exact claim-to-column mapping", async (a, b) => {
    reviewed();
    const dossier = getCohortComparison(a, b)!;
    const html = await renderComparison(a, b), body = md("people", dossier.path);
    for (const output of [decode(html), body]) {
      labelCount(output, 1); expectDossier(output, dossier);
      expect(output).toContain(dossier.question);
      for (const check of dossier.decision_checks) expect(output).toContain(check);
      for (const path of dossier.related_paths) expect(output).toContain(path);
    }
    expect(html.indexOf('<section aria-label="Documentation dossier">')).toBeGreaterThan(html.indexOf(pairsBefore.find(p => p.a === a && p.b === b)!.intro));
    expect(html.indexOf('</section>')).toBeLessThan(html.indexOf('<h2>Twin Scores side by side</h2>'));
    const rows = [...section(html).matchAll(/<tr>([\s\S]*?)<\/tr>/g)].slice(1);
    expect(rows).toHaveLength(dossier.rows.length);
    dossier.rows.forEach((row, index) => {
      const cells = [...rows[index][1].matchAll(/<td>([\s\S]*?)<\/td>/g)].map(m => decode(m[1]));
      expect(cells).toHaveLength(2);
      row.a_claim_ids.forEach(id => expect(cells[0]).toContain(id));
      row.b_claim_ids.forEach(id => expect(cells[1]).toContain(id));
      const mdRow = body.split("\n").find(line => line.startsWith(`| ${row.topic} |`))!.split("|");
      row.a_claim_ids.forEach(id => expect(mdRow[2]).toContain(id));
      row.b_claim_ids.forEach(id => expect(mdRow[3]).toContain(id));
    });
  });

  it.each(noncohort)("keeps every $slug noncohort consumer byte-identical with a reviewed fixture", async ({ slug }) => {
    mutable.review_status = "draft"; mutable.review = null;
    const before = await productOutputs(slug);
    reviewed();
    const after = await productOutputs(slug);
    expect(after).toEqual(before);
    for (const body of after) { labelCount(decode(body), 0); expect(body).not.toContain("E02-"); }
  });

  it.each(otherPairs)("keeps curated noncohort $a vs $b HTML/MD byte-identical and dossier-free", async ({ a, b }) => {
    mutable.review_status = "draft"; mutable.review = null;
    const before = [await renderComparison(a, b), md("people", `/compare/${a}-vs-${b}`)];
    reviewed();
    const after = [await renderComparison(a, b), md("people", `/compare/${a}-vs-${b}`)];
    expect(after).toEqual(before);
    for (const body of after) { labelCount(decode(body), 0); expect(body).not.toContain("E02-"); }
  });

  it.each(slugs)("closed/malformed provenance renders the original %s outputs without labels or dossier content", async slug => {
    mutable.review_status = "draft"; mutable.review = null;
    const baseline = await productOutputs(slug);
    for (const [status, review] of [["draft", fixtureReview], ["reviewed", null], ["reviewed", { ...fixtureReview, reviewer: " " }], ["reviewed", { ...fixtureReview, reviewed_sha: "A".repeat(40) }]] as const) {
      mutable.review_status = status; mutable.review = review;
      const actual = await productOutputs(slug);
      expect(actual).toEqual(baseline);
      for (const output of actual) { labelCount(decode(output), 0); expect(output).not.toContain("E02-"); }
    }
  });

  it.each(pairs)("closed/malformed provenance keeps %s vs %s original HTML/MD bytes", async (a, b) => {
    mutable.review_status = "draft"; mutable.review = null;
    const baseline = [await renderComparison(a, b), md("people", `/compare/${a}-vs-${b}`)];
    for (const [status, review] of [["draft", fixtureReview], ["reviewed", null], ["reviewed", { ...fixtureReview, review_file: false }]] as const) {
      mutable.review_status = status; mutable.review = review;
      const actual = [await renderComparison(a, b), md("people", `/compare/${a}-vs-${b}`)];
      expect(actual).toEqual(baseline);
      actual.forEach(output => { labelCount(decode(output), 0); expect(output).not.toContain("E02-"); });
    }
  });

  it("preserves all published metadata, static params and canonical inventory while active", async () => {
    mutable.review_status = "draft"; mutable.review = null;
    const before = { products: await Promise.all(slugs.map(slug => peopleMetadata(params(slug)))), agents: await Promise.all(slugs.map(slug => agentsMetadata(params(slug)))), comparisons: await Promise.all(pairs.map(([a, b]) => compareMetadata(pairParams(a, b)))), params: [peopleParams(), agentsParams(), compareParams()], canonical: [allCanonical("people"), allCanonical("agents")] };
    reviewed();
    expect({ products: await Promise.all(slugs.map(slug => peopleMetadata(params(slug)))), agents: await Promise.all(slugs.map(slug => agentsMetadata(params(slug)))), comparisons: await Promise.all(pairs.map(([a, b]) => compareMetadata(pairParams(a, b)))), params: [peopleParams(), agentsParams(), compareParams()], canonical: [allCanonical("people"), allCanonical("agents")] }).toEqual(before);
    for (const [a, b] of pairs) {
      expect(pageMarkdown("people", `/compare/${b}-vs-${a}`)).toEqual({ status: 308, location: `/compare/${a}-vs-${b}`, body: "" });
      await expect(Compare(pairParams(b, a))).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_REDIRECT;replace;") });
    }
    expect(pageMarkdown("people", "/compare/chatgpt-vs-cursor")).toMatchObject({ status: 200, robots: "noindex, follow" });
    for (const output of [await renderComparison("chatgpt", "cursor"), md("people", "/compare/chatgpt-vs-cursor")]) { labelCount(output, 0); expect(output).not.toContain("E02-"); }
  });

  it.each(["draft", "hidden"] as const)("does not leak cohort claims for synthetic %s entities", async status => {
    reviewed();
    catalog.products = productsBefore.map(p => p.slug === "chatgpt" ? { ...p, status } : p);
    expect(pageMarkdown("people", "/products/chatgpt").status).toBe(404);
    expect(pageMarkdown("agents", "/products/chatgpt").status).toBe(404);
    expect(skillMd("chatgpt")).toBe("");
    await expect(PeopleProduct(params("chatgpt"))).rejects.toMatchObject({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
    await expect(AgentsProduct(params("chatgpt"))).rejects.toMatchObject({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
    await expect(Compare(pairParams("chatgpt", "claude"))).rejects.toMatchObject({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
    const raw = await rawSkill(new Request("http://localhost/"), params("chatgpt"));
    expect(raw.status).toBe(404); expect(await raw.text()).not.toContain("E02-");
  });

  it("escapes dossier strings in actual SSR instead of interpreting source text as HTML", async () => {
    reviewed();
    sidecar.products.chatgpt.claims[0].statement = '<img src="x" onerror="alert(1)">';
    for (const html of [await renderProduct("people", "chatgpt"), await renderProduct("agents", "chatgpt"), await renderComparison("chatgpt", "claude")]) {
      expect(html).toContain("&lt;img"); expect(html).not.toContain('<img src="x"');
    }
    for (const body of [md("people", "/products/chatgpt"), md("agents", "/products/chatgpt"), skillMd("chatgpt"), md("people", "/compare/chatgpt-vs-claude")]) {
      expect(body).toContain("&lt;img"); expect(body).not.toContain('<img src="x"');
    }
  });

  it("keeps the existing structured-data bytes unchanged when dossier content becomes active", async () => {
    const schemas = (html: string) => [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(match => match[1]);
    mutable.review_status = "draft"; mutable.review = null;
    const before = [];
    for (const slug of slugs) before.push(schemas(await renderProduct("people", slug)), schemas(await renderProduct("agents", slug)));
    for (const [a, b] of pairs) before.push(schemas(await renderComparison(a, b)));
    reviewed();
    const after = [];
    for (const slug of slugs) after.push(schemas(await renderProduct("people", slug)), schemas(await renderProduct("agents", slug)));
    for (const [a, b] of pairs) after.push(schemas(await renderComparison(a, b)));
    expect(after).toEqual(before);
  });
});

const internalPublicationCopy = /\bactivation\b|If included in a dossier|our project|this project/;
async function activePublicProductOutputs(slug: string): Promise<Record<string, string>> {
  const html = renderToStaticMarkup(await Skill(params(slug))) as string;
  const raw = await rawSkill(new Request("http://localhost/"), params(slug));
  const negotiated = await agentsMarkdown(new Request(`http://localhost/md/skills/${slug}`), { params: Promise.resolve({ path: ["skills", slug] }) });
  return {
    "People HTML": decode(await renderProduct("people", slug)),
    "Agents HTML": decode(await renderProduct("agents", slug)),
    "People Markdown": md("people", `/products/${slug}`),
    "Agents Markdown": md("agents", `/products/${slug}`),
    "skillMd": skillMd(slug),
    "skill HTML": decode(html),
    "skill pre": decode(html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/)![1]),
    "raw skill": await raw.text(),
    "negotiated skill Markdown": await negotiated.text(),
  };
}

describe("reader-facing documentary limitations under the actual reviewed fixture", () => {
  it.each(slugs)("keeps internal publication instructions out of every active %s public representation", async slug => {
    reviewed();
    const dossier = getCohortProduct(slug)!;
    expect(dossier).toBeDefined();
    for (const [surface, output] of Object.entries(await activePublicProductOutputs(slug))) {
      expect(output, `${slug}: ${surface}`).toContain(dossier.claims[0].id);
      labelCount(output, 1);
      expect(output, `${slug}: ${surface}`).not.toMatch(internalPublicationCopy);
    }
  });

  it.each(pairs)("keeps internal publication instructions out of active %s vs %s HTML and Markdown", async (a, b) => {
    reviewed();
    const dossier = getCohortComparison(a, b)!;
    expect(dossier).toBeDefined();
    for (const output of [decode(await renderComparison(a, b)), md("people", dossier.path)]) {
      expect(output).toContain(dossier.claims[0].id);
      labelCount(output, 1);
      expect(output).not.toMatch(internalPublicationCopy);
    }
  });

  it("keeps the dated Supabase limitation and current-page check useful and identical across active HTML/Markdown/skill consumers", async () => {
    reviewed();
    expect(getCohortProduct("supabase")).toBeDefined();
    const limitation = "Status as documented on 2026-10-17; check the current Supabase API-key page before relying on legacy anon/service_role keys. No failure, revocation, key rotation or migration was observed.";
    const preflight = "Check the current Supabase API-key page for legacy-key deprecation status before relying on anon/service_role keys.";
    const outputs = await activePublicProductOutputs("supabase");
    for (const output of [...Object.values(outputs), decode(await renderComparison("supabase", "neon")), md("people", "/compare/supabase-vs-neon")]) {
      expect(output).toContain("E02-supabase-C02");
      expect(output).toContain(limitation);
      expect(output).toContain("by the end of 2026");
      expect(output).toContain("https://supabase.com/docs/guides/getting-started/api-keys");
      expect(output).not.toMatch(internalPublicationCopy);
    }
    for (const surface of ["Agents HTML", "Agents Markdown", "skillMd", "skill HTML", "skill pre", "raw skill", "negotiated skill Markdown"]) expect(outputs[surface], surface).toContain(preflight);
  });
});
