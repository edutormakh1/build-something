import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import catalog from "../packages/db/seed/catalog.json";
import evidence from "../packages/db/seed/evidence.json";
import manifest from "./fixtures/e01-repair-manifest.json";

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
type Locator = { collection: string; key: string; field: string };
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const dict = (value: Json) => value as Record<string, Json>;
function canonical(value: Json): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
function target(value: Json, loc: Locator) {
  const root = dict(value);
  let parent: Record<string, Json>;
  if (loc.collection === "rubric") parent = dict(root.rubric);
  else {
    const rows = root[loc.collection] as Record<string, Json>[];
    const matches = rows.filter((row) => loc.collection === "comparePairs"
      ? `${row.a}|${row.b}` === loc.key : row.slug === loc.key);
    expect(matches, `unique keyed record ${loc.collection}/${loc.key}`).toHaveLength(1);
    parent = matches[0];
  }
  const parts = loc.field.split(".");
  for (const part of parts.slice(0, -1)) parent = dict(parent[part]);
  return { parent, key: parts.at(-1)! };
}
function protectedHash(value: Json) {
  const copy = structuredClone(value);
  for (const field of manifest.fields) {
    const { parent, key } = target(copy, field);
    parent[key] = { E01_mutable_string: true };
  }
  return hash(canonical(copy));
}
function restoreAndValidate(value: Json) {
  expect(protectedHash(value)).toBe(manifest.protected_projection_sha256);
  const copy = structuredClone(value);
  for (const field of manifest.fields) {
    const { parent, key } = target(copy, field);
    expect(hash(parent[key] as string), `result hash ${field.collection}/${field.key}/${field.field}`).toBe(field.after_hash);
  }
  for (const patch of [...manifest.patches].reverse()) {
    const { parent, key } = target(copy, patch);
    const chars = Array.from(parent[key] as string);
    expect(chars.slice(patch.offset, patch.offset + Array.from(patch.after).length).join(""), patch.reason).toBe(patch.after);
    chars.splice(patch.offset, Array.from(patch.after).length, patch.before);
    parent[key] = chars.join("");
  }
  for (const field of manifest.fields) {
    const { parent, key } = target(copy, field);
    expect(hash(parent[key] as string)).toBe(field.before_hash);
  }
  expect(hash(canonical(copy))).toBe(manifest.baseline_canonical_sha256);
  return copy;
}

describe("E01 exact data preservation", () => {
  it("reconstructs the captured pre-E01 catalog from exact inverse spans, preserving all unowned fields and text", () => {
    expect(manifest.baseline_commit).toBe("5ef5dc00d844d353690bef979dd76808cc9aad0e");
    expect(manifest.baseline_file_sha256).toBe("3141b0797fc9af3acbe96efc58b726f366eac3e811ee138c2e3e3a34c4db8b1a");
    const original = restoreAndValidate(catalog as Json);
    // Replay also verifies expected occurrence counts before each forward span.
    for (const patch of manifest.patches) {
      const { parent, key } = target(original, patch);
      const text = parent[key] as string;
      expect(text.split(patch.before).length - 1).toBe(patch.expected_occurrences);
      const chars = Array.from(text);
      expect(chars.slice(patch.offset, patch.offset + Array.from(patch.before).length).join("")).toBe(patch.before);
      chars.splice(patch.offset, Array.from(patch.before).length, patch.after);
      parent[key] = chars.join("");
    }
    expect(original).toEqual(catalog);
  });

  it("rejects score changes and unrelated text edits inside otherwise mutable article bodies", () => {
    const scoreChange = structuredClone(catalog);
    scoreChange.products[0].twin.human += 1;
    expect(() => restoreAndValidate(scoreChange as Json)).toThrow();
    const textChange = structuredClone(catalog);
    textChange.articles[0].body += " Unapproved extra claim.";
    expect(() => restoreAndValidate(textChange as Json)).toThrow();
  });

  it("preserves absent documentary scores and the existing S02 rubric statement", () => {
    for (const review of catalog.reviews.filter((row) => row.kind === "public_quote")) {
      expect(review).not.toHaveProperty("scoreHuman");
      expect(review).not.toHaveProperty("scoreAgent");
      expect(review.body).toMatch(/editorial paraphrase.*not a direct quotation/);
    }
    expect(catalog.rubric.notes).toMatch(/^Scores are editorial 0-100 composites, not star averages and not user-count ratings\. We do not emit AggregateRating for Twin Scores\./);
    expect(manifest.fields.filter((field) => field.collection === "articles" && field.field === "description").map((field) => field.key).sort()).toEqual([
      "fake-ugc-editorial-policy", "human-vs-agent-software-surfaces-2026", "twin-score-gap-table-2026",
    ]);
    expect(manifest.patches.filter((patch) => patch.reason === "remove unsupported firsthand attestation")).toHaveLength(72);
    expect(manifest.fields.filter((field) => field.collection === "comparePairs")).toHaveLength(5);
  });

  it("keeps the internal evidence register documentary, attributable and explicitly unverified", () => {
    expect(Object.keys(evidence.products)).toHaveLength(10);
    expect(Object.keys(evidence.authors)).toHaveLength(3);
    expect(evidence.responsible_human_editor).toBeNull();
    for (const author of Object.values(evidence.authors)) {
      expect(author.identity_status).toBe("unverified");
      expect(author.credentials_status).toBe("unverified");
      expect(author.firsthand_tests).toEqual([]);
      expect(author.responsible_human_editor).toBeNull();
    }
    for (const product of Object.values(evidence.products)) {
      const row = catalog.products.find((row) => row.slug === product.slug)!;
      expect(product.legacy_twin).toEqual(row.twin);
      expect(product.hands_on_tests).toEqual([]);
      expect(product.responsible_human_editor).toBeNull();
      expect(product.method).toBe("documentation review");
      for (const id of product.documentation_evidence_ids) expect(evidence.documentation_sources.some((source) => source.id === id)).toBe(true);
      expect(product.existing_review_ids).toEqual(catalog.reviews.filter((review) => review.product === product.slug).map((review) => review.slug));
    }
    for (const source of evidence.documentation_sources) {
      expect(source.observed_date).toBe("2026-10-16");
      expect(source.source_url).toMatch(/^https:\/\//);
      expect(source.method).toBe("documentation review");
      expect(source.human_editor_responsible).toBeNull();
      expect(source.limits.length).toBeGreaterThan(20);
    }
    for (const topic of evidence.topic_hypotheses) expect(topic.demand_status).toMatch(/hypothesis pending validation/);
  });
});
