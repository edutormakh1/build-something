import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { allArticles, getArticle, getAuthor } from "@bs/db";
import { JsonLd } from "@bs/ui";
import { abs, articleJsonLd, breadcrumbJsonLd } from "@bs/seo";

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() {
  return allArticles().map((a) => ({ slug: a.slug }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const a = getArticle(slug);
  if (!a) return { title: "Not found" };
  return {
    title: a.title,
    description: a.description,
    alternates: { canonical: abs("people", `/blog/${a.slug}`) },
    openGraph: { title: a.title, description: a.description, type: "article" },
  };
}
export default async function Page({ params }: Props) {
  const { slug } = await params;
  const a = getArticle(slug);
  if (!a) notFound();
  const author = getAuthor(a.author);
  const paragraphs = a.body.split("\n\n");
  return (
    <article className="prose">
      <JsonLd data={[
        breadcrumbJsonLd("people", [{ name: "Home", path: "/" }, { name: "Journal", path: "/blog" }, { name: a.title, path: `/blog/${a.slug}` }]),
        articleJsonLd(a, author),
      ]} />
      <p className="kicker">{a.publishedAt} · {author?.name}</p>
      <h1>{a.title}</h1>
      <p>{a.description}</p>
      {paragraphs.map((block, i) => {
        if (block.startsWith("# ")) return null;
        if (block.startsWith("## ")) return <h2 key={i}>{block.replace(/^## /, "")}</h2>;
        if (block.startsWith("### ")) return <h3 key={i}>{block.replace(/^### /, "")}</h3>;
        if (block.startsWith("|")) {
          return (
            <pre key={i} className="overflow-auto text-sm">
              {block}
            </pre>
          );
        }
        if (block.startsWith("- ")) {
          return (
            <ul key={i}>
              {block.split("\n").map((li) => (
                <li key={li}>{li.replace(/^- /, "")}</li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{block}</p>;
      })}
      <p>
        Written by {author ? <Link href={`/authors/${author.slug}`}>{author.name}</Link> : a.author}. Updated {a.updatedAt}.
      </p>
    </article>
  );
}
