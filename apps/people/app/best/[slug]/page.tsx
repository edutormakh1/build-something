import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allCategories, getCategory, productsInCategory } from "@bs/db";
import { JsonLd } from "@bs/ui";
import { abs, breadcrumbJsonLd, itemListJsonLd } from "@bs/seo";

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() {
  return allCategories().map((c) => ({ slug: c.slug }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = getCategory(slug);
  if (!c) return { title: "Not found" };
  return {
    title: `Best ${c.name} software in 2026`,
    description: `Editorial ranking of ${c.name} by human Twin Score. Not paid placement.`,
    alternates: { canonical: abs("people", `/best/${c.slug}`) },
  };
}
export default async function Page({ params }: Props) {
  const { slug } = await params;
  const c = getCategory(slug);
  if (!c) notFound();
  const ranked = productsInCategory(c.slug).slice().sort((a, b) => b.twin.human - a.twin.human);
  return (
    <article className="prose">
      <JsonLd data={[
        breadcrumbJsonLd("people", [{ name: "Home", path: "/" }, { name: `Best ${c.name}`, path: `/best/${c.slug}` }]),
        itemListJsonLd("people", `Best ${c.name}`, ranked.map((p) => ({ name: p.name, path: `/products/${p.slug}` }))),
      ]} />
      <h1>Best {c.name} software in 2026</h1>
      <p>
        This is an editorial ranking of published {c.name} products by human Twin Score. It is not a paid list, not a scraped star average, and not a user poll. Agent rankings live on the twin site.
      </p>
      <h2>Ranked by human Twin Score</h2>
      <h3>How to read the list</h3>
      <ol>
        {ranked.map((p) => (
          <li key={p.slug}>
            <Link href={`/products/${p.slug}`}>{p.name}</Link> — {p.twin.human} human / {p.twin.agent} agent. {p.description}
          </li>
        ))}
      </ol>
    </article>
  );
}
