import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  allProducts,
  alternativesOf,
  getProduct,
  reviewsFor,
} from "@bs/db";
import { Breadcrumbs, JsonLd, TwinScore } from "@bs/ui";
import {
  breadcrumbJsonLd,
  abs,
  curatedComparisonPath,
  softwareJsonLd,
  getCohortProduct,
  COHORT_LEGACY_CONTENT_LABEL,
} from "@bs/seo";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return allProducts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) return { title: "Not found" };
  const url = abs("people", `/products/${p.slug}`);
  return {
    title: `${p.name} review and Twin Score`,
    description: p.description,
    alternates: { canonical: url },
    openGraph: { title: `${p.name} · Twin Score`, description: p.description, url },
    twitter: { card: "summary_large_image", title: p.name, description: p.description },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) notFound();
  const reviews = reviewsFor(p.slug);
  const alts = alternativesOf(p.slug);
  const dossier = getCohortProduct(p.slug);
  return (
    <article className="prose">
      <JsonLd
        data={[
          breadcrumbJsonLd("people", [
            { name: "Home", path: "/" },
            { name: "Products", path: "/products" },
            { name: p.name, path: `/products/${p.slug}` },
          ]),
          softwareJsonLd("people", p, reviews),
        ]}
      />
      <Breadcrumbs
        items={[
          { href: "/", label: "Home" },
          { href: "/products", label: "Products" },
          { href: `/products/${p.slug}`, label: p.name },
        ]}
      />
      {dossier ? <p>{COHORT_LEGACY_CONTENT_LABEL}</p> : null}
      <header className="piece-head">
      <p className="kicker">{p.vendor} · {p.category} · founded {p.founded}</p>
      <h1>{p.name} for humans</h1>
      <p>{p.longDescription}</p>
      <TwinScore human={p.twin.human} agent={p.twin.agent} updated={p.twin.updated} emphasize="human" />
      <p>
        Catalog editor attribution: <Link href="/authors/edu-tor">Edu Tor</Link>. Catalog score date {p.twin.updated}. Method:{" "}
        <Link href="/methodology">methodology</Link> and <Link href="/scorecard">rubric</Link>.
      </p>
      </header>
      <p>
        Twin page for agents:{" "}
        <a href={abs("agents", `/products/${p.slug}`)}>
          {p.name} on Build Something Agents Want
        </a>
        .
      </p>
      {dossier ? (
        <section aria-label="Documentation dossier">
          <h2>Documentation dossier: choosing access</h2>
          <p>{dossier.people.question}</p>
          <ul>{dossier.people.decision_checks.map(check => <li key={check}>{check}</li>)}</ul>
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
          <ul>{dossier.related_paths.map(path => <li key={path}><a href={path}>{path}</a></li>)}</ul>
        </section>
      ) : null}
      <h2>Capability matrix</h2>
      <p>
        This matrix is the same data agents see. Capability grades are retained catalog judgments; dated documentation checks support only the specific facts they cite. A grade alone does not establish a current MCP server.
      </p>
      <h3>API, MCP, CLI, docs, auth</h3>
      <table>
        <thead>
          <tr><th>Surface</th><th>Level</th></tr>
        </thead>
        <tbody>
          <tr><td>API</td><td>{p.capabilities.api}</td></tr>
          <tr><td>MCP</td><td>{p.capabilities.mcp}</td></tr>
          <tr><td>CLI</td><td>{p.capabilities.cli}</td></tr>
          <tr><td>Docs</td><td>{p.capabilities.docs}</td></tr>
          <tr><td>Auth</td><td>{p.capabilities.auth}</td></tr>
          <tr><td>SDKs</td><td>{p.capabilities.sdks.join(", ") || "none listed"}</td></tr>
        </tbody>
      </table>
      <h2>Pricing and facts</h2>
      <p>{p.pricing} Headquarters: {p.headquarters}. Official site: <a href={p.website}>{p.website}</a>.</p>
      <h3>Editorial reviews</h3>
      <ul>
        {reviews.map((r) => (
          <li key={r.slug}>
            <Link href={`/reviews/${r.slug}`}>{r.title}</Link> — {r.kind}
            {r.sourceUrl ? ` · source ${r.sourceName}` : " · catalog attribution"}
          </li>
        ))}
      </ul>
      <h2>Alternatives</h2>
      <ul>
        {alts.map((a) => {
          const comparePath = curatedComparisonPath(p.slug, a.slug);
          return (
          <li key={a.slug}>
            <Link href={`/products/${a.slug}`}>{a.name}</Link>
            {comparePath ? <> (<Link href={comparePath}>compare</Link>)</> : null}
          </li>
          );
        })}
      </ul>
      <p>
        <Link href={`/alternatives/${p.slug}`}>All alternatives to {p.name}</Link> ·{" "}
        <Link href={`/categories/${p.category}`}>{p.category}</Link> ·{" "}
        <Link href="/scorecard">Rubric</Link>
      </p>
    </article>
  );
}
