import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { catalog, getProduct } from "@bs/db";
import { JsonLd, TwinScore } from "@bs/ui";
import { breadcrumbJsonLd } from "@bs/seo";

type Props = { params: Promise<{ pair: string }> };

export function generateStaticParams() {
  return catalog.comparePairs.map((p) => ({ pair: `${p.a}-vs-${p.b}` }));
}

function splitPair(pair: string): [string, string] | null {
  const i = pair.indexOf("-vs-");
  if (i <= 0) return null;
  return [pair.slice(0, i), pair.slice(i + 4)];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pair } = await params;
  const parts = splitPair(pair);
  if (!parts) return { title: "Not found" };
  const [a, b] = parts;
  const pa = getProduct(a); const pb = getProduct(b);
  if (!pa || !pb) return { title: "Not found" };
  return {
    title: `${pa.name} vs ${pb.name}`,
    description: `Editorial Twin Score comparison of ${pa.name} and ${pb.name}.`,
    alternates: { canonical: `https://buildsomethingpeoplewant.com/compare/${a}-vs-${b}` },
  };
}

export default async function Page({ params }: Props) {
  const { pair } = await params;
  const parts = splitPair(pair);
  if (!parts) notFound();
  const [a, b] = parts;
  const pa = getProduct(a); const pb = getProduct(b);
  if (!pa || !pb) notFound();
  const intro = catalog.comparePairs.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a))?.intro
    ?? `${pa.name} versus ${pb.name}, compared with Twin Scores rather than a single winner banner.`;
  return (
    <article className="prose">
      <JsonLd data={breadcrumbJsonLd("people", [
        { name: "Home", path: "/" },
        { name: `${pa.name} vs ${pb.name}`, path: `/compare/${pair}` },
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
      <p>Unique intro lives on this URL only. See also <Link href={`/alternatives/${pa.slug}`}>alternatives to {pa.name}</Link>.</p>
    </article>
  );
}
