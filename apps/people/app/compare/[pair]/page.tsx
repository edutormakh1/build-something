import Link from "next/link";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { JsonLd, TwinScore } from "@bs/ui";
import { abs, breadcrumbJsonLd, curatedComparisons, resolveComparison } from "@bs/seo";

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

export default async function Page({ params }: Props) {
  const { pair } = await params;
  const result = comparisonPage(pair);
  const { a: pa, b: pb } = result;
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
