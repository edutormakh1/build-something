import { catalog, getProduct, type Product } from "@bs/db";
import { isValidSlug } from "./problem";

export type ComparisonPage = {
  kind: "page";
  a: Product;
  b: Product;
  path: string;
  indexable: boolean;
  intro?: string;
};

export type ComparisonResolution =
  | ComparisonPage
  | { kind: "redirect"; path: string }
  | { kind: "not-found" };

type CuratedPair = (typeof catalog.comparePairs)[number];
const SEPARATOR = "-vs-";

function validOperand(slug: string): boolean {
  return isValidSlug(slug) && !slug.includes(SEPARATOR);
}

function unorderedKey(a: string, b: string): string {
  return JSON.stringify(a < b ? [a, b] : [b, a]);
}

function curatedRegistry(): Map<string, CuratedPair> {
  const registry = new Map<string, CuratedPair>();
  for (const pair of catalog.comparePairs) {
    const key = unorderedKey(pair.a, pair.b);
    if (registry.has(key)) {
      throw new Error(`Duplicate curated comparison: ${pair.a} / ${pair.b}`);
    }
    registry.set(key, pair);
  }
  return registry;
}

/** Published curated pages, in their stored order and orientation. */
export function curatedComparisons(): ComparisonPage[] {
  const registry = curatedRegistry();
  const pages: ComparisonPage[] = [];
  for (const pair of registry.values()) {
    const result = resolveWithRegistry(`${pair.a}${SEPARATOR}${pair.b}`, registry);
    if (result.kind === "page" && result.indexable) pages.push(result);
  }
  return pages;
}

/** A link is eligible for indexed discovery only when the pair is curated. */
export function curatedComparisonPath(a: string, b: string): string | undefined {
  if (a === b || !validOperand(a) || !validOperand(b)) return undefined;
  const registry = curatedRegistry();
  const pair = registry.get(unorderedKey(a, b));
  if (!pair) return undefined;
  const result = resolveWithRegistry(`${pair.a}${SEPARATOR}${pair.b}`, registry);
  return result.kind === "page" && result.indexable ? result.path : undefined;
}

/** Resolve one route parameter, never an origin, pathname or query string. */
export function resolveComparison(pair: string): ComparisonResolution {
  return resolveWithRegistry(pair, curatedRegistry());
}

function resolveWithRegistry(pair: string, registry: Map<string, CuratedPair>): ComparisonResolution {
  const operands = pair.split(SEPARATOR);
  if (operands.length !== 2) return { kind: "not-found" };
  const [left, right] = operands;
  if (left === right || !validOperand(left) || !validOperand(right)) return { kind: "not-found" };

  const curated = registry.get(unorderedKey(left, right));
  const leftProduct = getProduct(left);
  const rightProduct = getProduct(right);
  if (!leftProduct || !rightProduct) return { kind: "not-found" };

  // Curated URLs retain their historical orientation; only uncurated pairs use
  // ordinary slug code-point order. Do not use locale-dependent collation.
  const keepRequestedOrder = curated ? curated.a === left : left < right;
  const [a, b] = keepRequestedOrder ? [leftProduct, rightProduct] : [rightProduct, leftProduct];
  const path = `/compare/${a.slug}${SEPARATOR}${b.slug}`;
  if (pair !== `${a.slug}${SEPARATOR}${b.slug}`) return { kind: "redirect", path };
  return {
    kind: "page", a, b, path, indexable: Boolean(curated),
    ...(curated ? { intro: curated.intro } : {}),
  };
}
