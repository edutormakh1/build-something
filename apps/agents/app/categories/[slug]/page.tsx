import { abs } from "@bs/seo";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allCategories, getCategory, productsInCategory } from "@bs/db";

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() {
  return allCategories().map((c) => ({ slug: c.slug }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = getCategory(slug);
  return { title: c?.name || "Not found", alternates: { canonical: abs("agents", `/categories/${slug}`) } };
}
export default async function Page({ params }: Props) {
  const { slug } = await params;
  const c = getCategory(slug);
  if (!c) notFound();
  const products = productsInCategory(c.slug);
  return (
    <article className="prose">
      <h1>{c.name}</h1>
      <p>{c.description}</p>
      <h2>Entities</h2>
      <h3>Same slugs as the people twin</h3>
      <ul>
        {products.map((p) => (
          <li key={p.slug}><Link href={`/products/${p.slug}`}>{p.name}</Link> · agent {p.twin.agent}</li>
        ))}
      </ul>
    </article>
  );
}
