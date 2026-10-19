import raw from "../../db/seed/editorial-cohort-e02.json";
import { getProduct } from "@bs/db";
import { resolveComparison } from "./comparisons";

export const COHORT_LEGACY_CONTENT_LABEL = "Catalog fields on this page (description, founded, headquarters, pricing, Twin Scores, capability grades) are retained catalog content. Only statements dated 2026-10-16 (E01 evidence register) or carrying an E02 claim ID were documentation-checked; everything else is unverified.";

export type CohortClaim = {
  id: string;
  statement: string;
  source_ids: string[];
  scope: string;
  version: string;
  checked_on: string;
  evidence_status: "documented" | "unknown";
  limitations: string;
};

export type CohortSource = {
  id: string;
  title: string;
  url: string;
  checked_on: string;
  method: "documentation review";
  retrieval_status: "retrieved";
  limitations: string;
  rights: string;
};

export type CohortProvenance = {
  checked_on: string;
  method: "documentation review";
  researcher: "automated agent";
  responsible_human_editor: null;
  product_tested: false;
  limits: string[];
};

type ProductDossier = {
  slug: string;
  group_id: "H1" | "H2";
  source_ids: string[];
  claims: CohortClaim[];
  people: { question: string; decision_checks: string[] };
  agents: { surface: string; preflight: string[]; stop_conditions: string[] };
  related_paths: string[];
};

type ComparisonDossier = {
  a: string;
  b: string;
  path: string;
  question: string;
  decision_checks: string[];
  rows: { topic: string; a_claim_ids: string[]; b_claim_ids: string[] }[];
  related_paths: string[];
};

export type CohortProduct = ProductDossier & CohortProvenance & { sources: CohortSource[] };
export type CohortComparison = ComparisonDossier & CohortProvenance & {
  claims: CohortClaim[];
  sources: CohortSource[];
};

type CohortDocument = CohortProvenance & {
  review_status: "draft" | "reviewed";
  review: null | { reviewer: string; review_file: string; reviewed_sha: string };
  sources: CohortSource[];
  products: Record<string, ProductDossier | undefined>;
  comparisons: Record<string, ComparisonDossier | undefined>;
};
const cohort = raw as CohortDocument;

function nonblank(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isReviewed(): boolean {
  // Shape validation cannot authenticate an actual review. Lead must check the
  // report and exact implementation SHA before a separate activation commit.
  const review = cohort.review;
  return cohort.review_status === "reviewed"
    && review !== null && typeof review === "object"
    && nonblank(review.reviewer) && nonblank(review.review_file)
    && typeof review.reviewed_sha === "string"
    && review.reviewed_sha.length === 40 && /^[0-9a-f]{40}$/.test(review.reviewed_sha);
}

function provenance(): CohortProvenance {
  return {
    checked_on: cohort.checked_on,
    method: cohort.method,
    researcher: cohort.researcher,
    responsible_human_editor: cohort.responsible_human_editor,
    product_tested: cohort.product_tested,
    limits: cohort.limits,
  };
}

function sourcesFor(claims: CohortClaim[]): CohortSource[] {
  const ids = new Set(claims.flatMap(claim => claim.source_ids));
  return cohort.sources.filter(source => ids.has(source.id));
}

/** A documentary supplement only for a reviewed, published cohort member. */
export function getCohortProduct(slug: string): CohortProduct | undefined {
  if (!isReviewed() || !getProduct(slug)
    || !Object.prototype.hasOwnProperty.call(cohort.products, slug)) return undefined;
  const dossier = cohort.products[slug];
  if (!dossier || dossier.slug !== slug) return undefined;
  return { ...dossier, ...provenance(), sources: sourcesFor(dossier.claims) };
}

/** Reverse redirects and public uncurated/noindex pages never get a dossier. */
export function getCohortComparison(a: string, b: string): CohortComparison | undefined {
  if (!isReviewed()) return undefined;
  const left = getCohortProduct(a);
  const right = getCohortProduct(b);
  if (!left || !right) return undefined;
  const resolved = resolveComparison(`${a}-vs-${b}`);
  if (resolved.kind !== "page" || !resolved.indexable
    || !Object.prototype.hasOwnProperty.call(cohort.comparisons, resolved.path)) return undefined;
  const dossier = cohort.comparisons[resolved.path];
  if (!dossier || dossier.path !== resolved.path || dossier.a !== a || dossier.b !== b) return undefined;
  const claims = [...left.claims, ...right.claims];
  return { ...dossier, ...provenance(), claims, sources: sourcesFor(claims) };
}
