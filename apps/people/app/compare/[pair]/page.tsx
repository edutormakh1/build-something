import Link from "next/link";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { JsonLd, TwinScore } from "@bs/ui";
import { abs, breadcrumbJsonLd, curatedComparisons, resolveComparison, getCohortComparison, COHORT_LEGACY_CONTENT_LABEL, type CohortClaim, type CohortSource } from "@bs/seo";

type Props = { params: Promise<{ pair: string }> };

export function generateStaticParams() {
  return curatedComparisons().map((comparison) => ({ pair: comparison.path.slice("/compare/".length) }));
}

function comparisonPage(pair: string) {
  const result = resolveComparison(pair);
  if (result.kind === "not-found") notFound();
  if (result.kind === "redirect") permanentRedirect(result.path);
  return result;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pair } = await params;
  const result = comparisonPage(pair);
  const { a: pa, b: pb } = result;
  return {
    title: `${pa.name} vs ${pb.name}`,
    description: `Editorial Twin Score comparison of ${pa.name} and ${pb.name}.`,
    alternates: { canonical: abs("people", result.path) },
    robots: { index: result.indexable, follow: true },
  };
}

function DocumentaryClaim({ claim, sources }: { claim: CohortClaim; sources: CohortSource[] }) {
  return (
    <div id={claim.id}>
      <p><strong>{claim.id} — {claim.evidence_status}</strong>: {claim.statement}</p>
      <p>Documentation checked: {claim.checked_on}. Scope: {claim.scope}. Version: {claim.version}.</p>
      <p>Limitations: {claim.limitations}</p>
      <p>Sources: {claim.source_ids.length ? claim.source_ids.map(id => {
        const source = sources.find(source => source.id === id);
        return source ? <a key={id} href={source.url}>{id} </a> : null;
      }) : "Unknown; no supporting source established for this claim."}</p>
    </div>
  );
}

export default async function Page({ params }: Props) {
  const { pair } = await params;
  const result = comparisonPage(pair);
  const { a: pa, b: pb } = result;
  const dossier = getCohortComparison(pa.slug, pb.slug);
  const intro = result.intro
    ?? `${pa.name} versus ${pb.name}, compared with Twin Scores rather than a single winner banner.`;
  return (
    <article className="prose">
      <JsonLd data={breadcrumbJsonLd("people", [
        { name: "Home", path: "/" },
        { name: `${pa.name} vs ${pb.name}`, path: result.path },
      ])} />
      <h1>{pa.name} vs {pb.name}</h1>
      <p>{intro}</p>
      {dossier ? (
        <>
          <p>{COHORT_LEGACY_CONTENT_LABEL}</p>
          <section aria-label="Documentation dossier">
            <h2>Documentation dossier: decision boundaries</h2>
            <p>{dossier.question}</p>
            <ul>{dossier.decision_checks.map(check => <li key={check}>{check}</li>)}</ul>
            <p>Responsible human editor: unassigned. Researcher: {dossier.researcher}. Method: {dossier.method}. Checked: {dossier.checked_on}. Product not tested.</p>
            <p>Unknowns describe the limits of this documentation review, not proof that a feature is absent. Documentation checks do not validate retained scores or grades.</p>
            <table>
              <thead><tr><th>Decision boundary</th><th>{pa.name}</th><th>{pb.name}</th></tr></thead>
              <tbody>{dossier.rows.map(row => (
                <tr key={row.topic}>
                  <th scope="row">{row.topic}</th>
                  <td>{dossier.claims.filter(claim => row.a_claim_ids.includes(claim.id)).map(claim => <DocumentaryClaim key={claim.id} claim={claim} sources={dossier.sources} />)}</td>
                  <td>{dossier.claims.filter(claim => row.b_claim_ids.includes(claim.id)).map(claim => <DocumentaryClaim key={claim.id} claim={claim} sources={dossier.sources} />)}</td>
                </tr>
              ))}</tbody>
            </table>
            <h3>Primary documentation</h3>
            <ul>{dossier.sources.map(source => <li key={source.id}><a href={source.url}>{source.id}: {source.title}</a>. Checked: {source.checked_on}. Limits: {source.limitations}</li>)}</ul>
            <h3>Related decisions</h3>
            <ul>{dossier.related_paths.map(path => <li key={path}><a href={path}>{path}</a></li>)}</ul>
          </section>
        </>
      ) : null}
      <h2>Twin Scores side by side</h2>
      <div className="grid-cards not-prose">
        <article className="card">
          <h2><Link href={`/products/${pa.slug}`}>{pa.name}</Link></h2>
          <TwinScore human={pa.twin.human} agent={pa.twin.agent} emphasize="human" />
          <p>{pa.description}</p>
        </article>
        <article className="card">
          <h2><Link href={`/products/${pb.slug}`}>{pb.name}</Link></h2>
          <TwinScore human={pb.twin.human} agent={pb.twin.agent} emphasize="human" />
          <p>{pb.description}</p>
        </article>
      </div>
      <h3>Capability snapshot</h3>
      <table>
        <thead><tr><th>Surface</th><th>{pa.name}</th><th>{pb.name}</th></tr></thead>
        <tbody>
          <tr><td>API</td><td>{pa.capabilities.api}</td><td>{pb.capabilities.api}</td></tr>
          <tr><td>MCP</td><td>{pa.capabilities.mcp}</td><td>{pb.capabilities.mcp}</td></tr>
          <tr><td>CLI</td><td>{pa.capabilities.cli}</td><td>{pb.capabilities.cli}</td></tr>
        </tbody>
      </table>
      <p>See also <Link href={`/alternatives/${pa.slug}`}>alternatives to {pa.name}</Link>.</p>
    </article>
  );
}
