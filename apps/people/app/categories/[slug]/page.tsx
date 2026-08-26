import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allCategories, getCategory, productsInCategory } from "@bs/db";
import { Breadcrumbs, JsonLd, TwinScore } from "@bs/ui";
import { breadcrumbJsonLd, itemListJsonLd } from "@bs/seo";

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() {
  return allCategories().map((c) => ({ slug: c.slug }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = getCategory(slug);
  if (!c) return { title: "Not found" };
  return {
    title: c.name,
    description: c.description,
    alternates: { canonical: `https://buildsomethingpeoplewant.com/categories/${c.slug}` },
  };
}
export default async function Page({ params }: Props) {
  const { slug } = await params;
  const c = getCategory(slug);
  if (!c) notFound();
  const products = productsInCategory(c.slug);
  return (
    <article className="prose">
      <JsonLd data={[
        breadcrumbJsonLd("people", [{ name: "Home", path: "/" }, { name: c.name, path: `/categories/${c.slug}` }]),
        itemListJsonLd("people", c.name, products.map((p) => ({ name: p.name, path: `/products/${p.slug}` }))),
      ]} />
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: `/categories/${c.slug}`, label: c.name }]} />
      <h1>{c.name} software with Twin Scores</h1>
      <p>{c.description} This category page is for humans; agent capability matrices live on the twin site under the same slugs.</p>
      <h2>Products</h2>
      <h3>Editorial set, not a paid ranking</h3>
      <div className="grid-cards not-prose">
        {products.map((p) => (
          <article key={p.slug} className="card">
            <h2 className="text-lg"><Link href={`/products/${p.slug}`}>{p.name}</Link></h2>
            <TwinScore human={p.twin.human} agent={p.twin.agent} emphasize="human" />
          </article>
        ))}
      </div>
      <p><Link href={`/best/${c.slug}`}>Best {c.name} in 2026</Link></p>
    </article>
  );
}
