import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allProducts, getProduct, reviewsFor } from "@bs/db";
import { JsonLd, TwinScore } from "@bs/ui";
import { breadcrumbJsonLd, softwareJsonLd } from "@bs/seo";

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
    description: `API, MCP, CLI, docs, and auth for ${p.name}. Agent Twin Score ${p.twin.agent}.`,
    alternates: { canonical: `https://buildsomethingagentswant.com/products/${p.slug}` },
  };
}
export default async function Page({ params }: Props) {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) notFound();
  const reviews = reviewsFor(p.slug);
  const cap = p.capabilities;
  return (
    <article className="prose">
      <JsonLd data={[
        breadcrumbJsonLd("agents", [{ name: "Home", path: "/" }, { name: "Products", path: "/products" }, { name: p.name, path: `/products/${p.slug}` }]),
        softwareJsonLd("agents", p, reviews),
      ]} />
      <p className="kicker">{p.vendor} · agent Twin Score {p.twin.agent}</p>
      <h1>{p.name} capability matrix</h1>
      <p>{p.longDescription}</p>
      <TwinScore human={p.twin.human} agent={p.twin.agent} updated={p.twin.updated} emphasize="agent" />
      <h2>API / MCP / CLI / docs / auth</h2>
      <p>MCP is {cap.mcp}. If that is none or basic, do not invent a server. Auth: {cap.auth}.</p>
      <h3>Matrix</h3>
      <table>
        <thead><tr><th>Surface</th><th>Level</th></tr></thead>
        <tbody>
          <tr><td>API</td><td>{cap.api}</td></tr>
          <tr><td>MCP</td><td>{cap.mcp}</td></tr>
          <tr><td>CLI</td><td>{cap.cli}</td></tr>
          <tr><td>Docs</td><td>{cap.docs}</td></tr>
          <tr><td>Auth</td><td>{cap.auth}</td></tr>
          <tr><td>Webhooks</td><td>{cap.webhooks}</td></tr>
          <tr><td>SDKs</td><td>{cap.sdks.join(", ") || "none listed"}</td></tr>
        </tbody>
      </table>
      <p>
        <Link href={`/skills/${p.slug}`}>SKILL.md</Link> ·{" "}
        <a href={`https://buildsomethingpeoplewant.com/products/${p.slug}`}>Human twin page</a> ·{" "}
        <a href={p.website}>Official site</a>
      </p>
    </article>
  );
}
