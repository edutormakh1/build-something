import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Fixed committed inputs only. Never import or execute application modules.
const SOURCE_SHA = '989addd145ab7f315d36c8bb30b8c487e57c9a67';
const INPUTS = {
  'packages/db/seed/editorial-cohort-e02.json': '34ef1200bbc90cc420ef6320116d97d8181fb1a313abb958e620221f461a0af1',
  'packages/db/seed/catalog.json': 'f12a2d2efd1704aef5273c735a5e2a72bb6b5b161ef4d2dc93095d9035d3414a',
  'packages/db/src/catalog.ts': '03266dcd5caae1d11101f93bc022039e5c4e89e90c74f480ecd6e443ae715dd8',
  'packages/seo/src/sites.ts': 'e8b7acf69ff74a4732d0a29e5b81a601101c7ffa52df41452d6df373ae09b9fc',
  'packages/seo/src/comparisons.ts': '9a7ccb0b813c0a222297d0ab26e8d35b6408f027627a390bf676bd3152d025b2',
  'packages/seo/src/cohort.ts': '02320cc516a45742537d3aaa8487eda1d7ef1959f014b2119c2a2ef946583514',
  'apps/people/app/products/[slug]/page.tsx': '9bcb1564dc69ead619830141c13bbd7b1f6b2527be241f86060c0ec54e8a1962',
  'apps/agents/app/products/[slug]/page.tsx': '250002c245c33067baa1cb9fa311c4f6ff511bec87691496949420c3747bbc05',
  'apps/people/app/compare/[pair]/page.tsx': '849abda1917dbf987da465c91b976186253aa0318c070b84c39ee809c22ee397',
  'apps/agents/app/skills/[slug]/page.tsx': 'c029990333c5865efa2c829c200a3b26265b8daa9d7000678f1957004ff975ec',
  'apps/agents/app/methodology/page.tsx': '62a5c99248b20115f26e0170974e9b41fe833c95e2b4acd3f0c2c624759adbc6',
  'apps/agents/app/scorecard/page.tsx': '2cd8117b867cb2bab5a8800c9f3b857e1195d9be7dd71bb58ff71c0c31469ccb',
  'apps/agents/app/dataset/twin-scores.json/route.ts': '28685eff2ec546981dfbfe4fe87a0da685e36942699094fa1d95441c52aa5e90',
  'apps/agents/app/dataset/twin-scores.csv/route.ts': '3642b5ccd01e25bcb07c8fc8dc5dc6b75f73c27040af6f4ce892c732db48207f',
};
const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
  throw new Error('Usage: node generate.mjs [--check]');
}
const root = fileURLToPath(new URL('../../../', import.meta.url));
const inputs = Object.fromEntries(Object.entries(INPUTS).map(([path, expected]) => {
  // No shell, inherited environment, user-selected revision or source pathname.
  const bytes = execFileSync('/usr/bin/git', ['show', `${SOURCE_SHA}:${path}`], {
    cwd: root, env: {}, maxBuffer: 4 * 1024 * 1024,
  });
  if (createHash('sha256').update(bytes).digest('hex') !== expected) {
    throw new Error(`Input SHA-256 mismatch: ${path}`);
  }
  return [path, bytes.toString('utf8')];
}));
const sidecar = JSON.parse(inputs['packages/db/seed/editorial-cohort-e02.json']);
const catalog = JSON.parse(inputs['packages/db/seed/catalog.json']);
const origin = (site) => {
  const match = inputs['packages/seo/src/sites.ts'].match(
    new RegExp(`export const ${site.toUpperCase()}_HOST = "([^"]+)";`),
  );
  if (!match) throw new Error(`Missing fixed ${site} host`);
  return `https://${match[1]}`;
};
const availability = 'source-backed at pinned commit; no new HTTP verification';
const link = (site, path, sourcePath) => ({
  url: `${origin(site)}${path}`, availability, source_path: sourcePath,
});
const sources = new Map(sidecar.sources.map(source => [source.id, source]));
const products = Object.values(sidecar.products).map(product => {
  const entry = catalog.products.find(item => item.slug === product.slug);
  if (!entry || entry.status !== 'published') throw new Error('Missing published cohort product');
  return {
    slug: product.slug, name: entry.name, group_id: product.group_id,
    links: {
      people: link('people', `/products/${product.slug}`, 'apps/people/app/products/[slug]/page.tsx'),
      agents: link('agents', `/products/${product.slug}`, 'apps/agents/app/products/[slug]/page.tsx'),
      skill: link('agents', `/skills/${product.slug}`, 'apps/agents/app/skills/[slug]/page.tsx'),
    },
  };
});
const claims = Object.values(sidecar.products).flatMap(product => product.claims.map(claim => ({
  ...claim,
  product_slug: product.slug,
  product_name: products.find(item => item.slug === product.slug).name,
  group_id: product.group_id,
  group_title: sidecar.groups.find(group => group.id === product.group_id).title,
  source_urls: claim.source_ids.map(id => {
    const source = sources.get(id);
    if (!source || source.retrieval_status !== 'retrieved') throw new Error(`Missing source: ${id}`);
    return source.url;
  }),
  method: sidecar.method,
  researcher: sidecar.researcher,
  responsible_human_editor: sidecar.responsible_human_editor,
  responsible_human_editor_status: 'unassigned',
  product_tested: sidecar.product_tested,
})));
const comparisons = Object.values(sidecar.comparisons).map(comparison => {
  const pair = catalog.comparePairs.find(item => item.a === comparison.a && item.b === comparison.b);
  if (!pair || comparison.path !== `/compare/${pair.a}-vs-${pair.b}`) {
    throw new Error('Comparison orientation differs from pinned curated catalog');
  }
  return {
    ...comparison,
    people_canonical: link('people', comparison.path, 'apps/people/app/compare/[pair]/page.tsx'),
  };
});
const count = status => claims.filter(claim => claim.evidence_status === status).length;
if (claims.length !== 29 || new Set(claims.map(claim => claim.id)).size !== 29
    || count('documented') !== 19 || count('unknown') !== 10
    || products.length !== 10 || comparisons.length !== 5 || sidecar.groups.length !== 2
    || claims.some(claim => claim.checked_on !== '2026-10-17')
    || sidecar.responsible_human_editor !== null || sidecar.product_tested !== false) {
  throw new Error('Pinned documentary cohort differs from the draft contract');
}
const output = {
  title: 'Documentation-backed access decisions for ten software products — evidence companion, checked 2026-10-17',
  status: 'local draft; unpublished; independent review pending; no G01 or E02 completion claim',
  source_sha: SOURCE_SHA,
  input_sha256: INPUTS,
  source_provenance: {
    cohort_id: sidecar.cohort_id, source_sha: sidecar.source_sha,
    review_status: sidecar.review_status, review: sidecar.review,
    checked_on: sidecar.checked_on, method: sidecar.method, researcher: sidecar.researcher,
    responsible_human_editor: sidecar.responsible_human_editor, product_tested: sidecar.product_tested,
  },
  counts: { products: products.length, comparisons: comparisons.length, groups: sidecar.groups.length,
    product_claims: claims.length, documented: count('documented'), unknown: count('unknown') },
  limits: sidecar.limits,
  redistribution_rights_assessment: 'Pending where unestablished. Own dated claim synthesis and primary links only; no vendor full text, research quotations or blanket third-party licence. Not legal advice.',
  groups: sidecar.groups.map(({ id, title, products, demand_status }) => ({ id, title, products, demand_status })),
  sources: sidecar.sources,
  products,
  claims,
  comparisons,
  agents_artifacts: {
    methodology: link('agents', '/methodology', 'apps/agents/app/methodology/page.tsx'),
    scorecard: link('agents', '/scorecard', 'apps/agents/app/scorecard/page.tsx'),
    legacy_dataset_json: link('agents', '/dataset/twin-scores.json', 'apps/agents/app/dataset/twin-scores.json/route.ts'),
    legacy_dataset_csv: link('agents', '/dataset/twin-scores.csv', 'apps/agents/app/dataset/twin-scores.csv/route.ts'),
    legacy_dataset_metadata: { license: catalog.license, generatedAt: catalog.generatedAt,
      limits: 'Legacy estimates and capability projection; no E02 claim register or original scoring observations. Cannot reproduce a product benchmark.' },
  },
};
const bytes = Buffer.from(`${JSON.stringify(output, null, 2)}\n`);
const destination = new URL('./claims.json', import.meta.url);
if (args[0] === '--check') {
  if (!bytes.equals(readFileSync(destination))) throw new Error('claims.json differs; regenerate from pinned inputs');
  console.log('claims.json matches pinned inputs (29 claims: 19 documented, 10 unknown)');
} else {
  writeFileSync(destination, bytes);
  console.log('Wrote claims.json from pinned inputs');
}
