import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allAuthors, catalog, getAuthor, getReview } from "@bs/db";
import { JsonLd } from "@bs/ui";
import { abs, breadcrumbJsonLd, personJsonLd } from "@bs/seo";

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() {
  return allAuthors().map((a) => ({ slug: a.slug }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const a = getAuthor(slug);
  if (!a) return { title: "Not found" };
  return {
    title: a.name,
    description: a.bio,
    alternates: { canonical: abs("people", `/authors/${a.slug}`) },
  };
}
export default async function Page({ params }: Props) {
  const { slug } = await params;
  const a = getAuthor(slug);
  if (!a) notFound();
  const reviews = catalog.reviews.filter((r) => r.author === a.slug && getReview(r.slug)).slice(0, 20);
  const posts = catalog.articles.filter((p) => p.author === a.slug);
  return (
    <article className="prose">
      <JsonLd data={[
        breadcrumbJsonLd("people", [{ name: "Home", path: "/" }, { name: a.name, path: `/authors/${a.slug}` }]),
        personJsonLd(a),
      ]} />
      <h1>{a.name}</h1>
      <p>{a.bio}</p>
      <h2>Attribution and evidence status</h2>
      <p>{a.credentials}</p>
      <h3>Role</h3>
      <p>{a.role}</p>
      <h2>Selected reviews</h2>
      <ul>
        {reviews.map((r) => (
          <li key={r.slug}><Link href={`/reviews/${r.slug}`}>{r.title}</Link></li>
        ))}
      </ul>
      <h2>Articles</h2>
      <ul>
        {posts.map((p) => (
          <li key={p.slug}><Link href={`/blog/${p.slug}`}>{p.title}</Link></li>
        ))}
      </ul>
    </article>
  );
}
