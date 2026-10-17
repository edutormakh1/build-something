import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allProducts, getProduct, reviewsFor } from "@bs/db";
import { JsonLd, TwinScore } from "@bs/ui";
import { abs, breadcrumbJsonLd, softwareJsonLd, getCohortProduct, COHORT_LEGACY_CONTENT_LABEL } from "@bs/seo";

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() {
  return allProducts().map((p) => ({ slug: p.slug }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) return { title: "Not found" };
  return {
    title: `${p.name} capability matrix`,
    description: `API, MCP, CLI, docs, and auth for ${p.name}. Legacy agent Twin Score estimate ${p.twin.agent}.`,
    alternates: { canonical: abs("agents", `/products/${p.slug}`) },
  };
}

const WIDTH: Record<string, string> = { none: "8%", basic: "34%", strong: "67%", excellent: "100%" };

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) notFound();
  const reviews = reviewsFor(p.slug);
  const cap = p.capabilities;
  const dossier = getCohortProduct(p.slug);
  return (
    <article className="prose">
      <JsonLd data={[
        breadcrumbJsonLd("agents", [{ name: "Home", path: "/" }, { name: "Products", path: "/products" }, { name: p.name, path: `/products/${p.slug}` }]),
        softwareJsonLd("agents", p, reviews),
      ]} />
      {dossier ? <p>{COHORT_LEGACY_CONTENT_LABEL}</p> : null}
      <header className="piece-head">
      <p className="kicker">{p.vendor} · legacy agent Twin Score estimate {p.twin.agent}</p>
      <h1>{p.name} capability matrix</h1>
      <p>{p.longDescription}</p>
      <TwinScore human={p.twin.human} agent={p.twin.agent} updated={p.twin.updated} emphasize="agent" />
      </header>
      <p>
        Catalog attribution: Edu Tor; professional history and firsthand product evaluations are not independently verified. Catalog score date {p.twin.updated}. See <Link href="/methodology">methodology</Link> and{" "}
        <Link href="/scorecard">the rubric</Link>. Meaning is in this HTML, not in any canvas.
      </p>
      {dossier ? (
        <section aria-label="Documentation dossier">
          <h2>Documentation dossier: integration preflight</h2>
          <p>{dossier.agents.surface}</p>
          <h3>Preflight</h3>
          <ul>{dossier.agents.preflight.map(check => <li key={check}>{check}</li>)}</ul>
          <h3>Stop conditions</h3>
          <ul>{dossier.agents.stop_conditions.map(condition => <li key={condition}>{condition}</li>)}</ul>
          <p>Responsible human editor: unassigned. Researcher: {dossier.researcher}. Method: {dossier.method}. Checked: {dossier.checked_on}. Product not tested.</p>
          <p>Unknowns describe the limits of this documentation review, not proof that a feature is absent. Documentation checks do not validate retained scores or grades.</p>
          <h3>Claims and unknowns</h3>
          <ul>{dossier.claims.map(claim => (
            <li key={claim.id} id={claim.id}>
              <p><strong>{claim.id} — {claim.evidence_status}</strong>: {claim.statement}</p>
              <p>Documentation checked: {claim.checked_on}. Scope: {claim.scope}. Version: {claim.version}.</p>
              <p>Limitations: {claim.limitations}</p>
              <p>Sources: {claim.source_ids.length ? claim.source_ids.map(id => {
                const source = dossier.sources.find(source => source.id === id);
                return source ? <a key={id} href={source.url}>{id} </a> : null;
              }) : "Unknown; no supporting source established for this claim."}</p>
            </li>
          ))}</ul>
          <h3>Primary documentation</h3>
          <ul>{dossier.sources.map(source => <li key={source.id}><a href={source.url}>{source.id}: {source.title}</a>. Checked: {source.checked_on}. Limits: {source.limitations}</li>)}</ul>
          <h3>Related decisions</h3>
          <ul>{dossier.related_paths.map(path => <li key={path}><a href={path.startsWith("/compare/") ? abs("people", path) : path}>{path}</a></li>)}</ul>
        </section>
      ) : null}
      <h2>API / MCP / CLI / docs / auth</h2>
      <p>Legacy capability grades, not re-evaluated by this audit.</p>
      {dossier ? <p>See the cohort dossier and its limits for documented MCP roles and access scope. Legacy capability grades do not establish a callable external MCP endpoint. Auth: {cap.auth}.</p> : <p>MCP is {cap.mcp}. If that is none or basic, do not invent a server. Auth: {cap.auth}.</p>}
      <h3>Matrix</h3>
      <div className="plaque">
        <table>
          <thead><tr><th>Surface</th><th>Level</th></tr></thead>
          <tbody>
            {([
              ["API", cap.api],
              ["MCP", cap.mcp],
              ["CLI", cap.cli],
              ["Docs", cap.docs],
              ["Webhooks", cap.webhooks],
            ] as const).map(([label, level]) => (
              <tr key={label}>
                <td>{label}</td>
                <td>
                  <span className="level">
                    <i style={{ width: WIDTH[level] || "34%" }} />
                    <em>{level}</em>
                  </span>
                </td>
              </tr>
            ))}
            <tr><td>Auth</td><td>{cap.auth}</td></tr>
            <tr><td>SDKs</td><td>{cap.sdks.join(", ") || "none listed"}</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        <Link href={`/skills/${p.slug}`}>SKILL.md</Link>
        {" · "}
        <a href={abs("people", `/products/${p.slug}`)}>Human twin page</a>
        {" · "}
        <a href={p.website}>Official site</a>
      </p>
    </article>
  );
}
