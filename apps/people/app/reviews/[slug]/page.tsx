import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { catalog, getAuthor, getProduct, getReview } from "@bs/db";
import { JsonLd } from "@bs/ui";
import { abs, breadcrumbJsonLd, reviewJsonLd } from "@bs/seo";

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() {
  return catalog.reviews.filter((r) => getReview(r.slug)).map((r) => ({ slug: r.slug }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const r = getReview(slug);
  if (!r) return { title: "Not found" };
  return {
    title: r.title,
    description: r.body.slice(0, 155),
    alternates: { canonical: abs("people", `/reviews/${r.slug}`) },
  };
}
export default async function Page({ params }: Props) {
  const { slug } = await params;
  const r = getReview(slug);
  if (!r || r.status !== "published") notFound();
  const p = getProduct(r.product);
  const author = getAuthor(r.author);
  if (!p) notFound();
  const reviewSchema = reviewJsonLd("people", p, r, author);
  const rating = reviewSchema.reviewRating;
  return (
    <article className="prose">
      <JsonLd data={[
        breadcrumbJsonLd("people", [
          { name: "Home", path: "/" },
          { name: p.name, path: `/products/${p.slug}` },
          { name: r.title, path: `/reviews/${r.slug}` },
        ]),
        reviewSchema,
      ]} />
      <p className="kicker">{r.kind} · {r.publishedAt} {r.sourceUrl ? "· public quote" : "· staff editorial"}</p>
      <h1>{r.title}</h1>
      <p>{r.body}</p>
      <h2>Review score</h2>
      <p>
        {rating ? `Human review score: ${rating.ratingValue}/100.` : "Unscored review: no usable human review score is recorded."}
      </p>
      <h2>How to read this review</h2>
      <p>
        Kind is {r.kind}. We never present fake UGC as authentic. User reviews, when they exist, require signup and admin approval and stay pending until then.
      </p>
      <h3>Byline</h3>
      <p>
        {author ? <Link href={`/authors/${author.slug}`}>{author.name}</Link> : r.author} on{" "}
        <Link href={`/products/${p.slug}`}>{p.name}</Link>.
        {r.sourceUrl ? <> Source: <a href={r.sourceUrl}>{r.sourceName || r.sourceUrl}</a>.</> : null}
      </p>
    </article>
  );
}
