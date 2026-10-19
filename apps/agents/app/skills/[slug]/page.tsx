import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { allProducts, getProduct } from "@bs/db";
import { abs, skillMd } from "@bs/seo";

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() {
  return allProducts().map((p) => ({ slug: p.slug }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) return { title: "Not found" };
  return {
    title: `SKILL.md for ${p.name}`,
    description: `Agent skill file for ${p.name}.`,
    alternates: { canonical: abs("agents", `/skills/${p.slug}`) },
  };
}
export default async function Page({ params }: Props) {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) notFound();
  return (
    <article className="prose">
      <p className="kicker">Close study · not a fake MCP listing</p>
      <h1>SKILL.md — {p.name}</h1>
      <p>Real skill file for agents. When to use / when not is inside the document. This is not a fake MCP listing.</p>
      <h2>File</h2>
      <h3>Raw</h3>
      <pre className="overflow-auto text-sm whitespace-pre-wrap">{skillMd(p.slug)}</pre>
      <p><Link href={`/skills/${p.slug}/raw`}>Download raw</Link> · <Link href={`/products/${p.slug}`}>Capability matrix</Link></p>
    </article>
  );
}
