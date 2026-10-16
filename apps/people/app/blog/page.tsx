import Link from "next/link";
import type { Metadata } from "next";
import { allArticles, getAuthor } from "@bs/db";
import { JsonLd } from "@bs/ui";
import { abs, breadcrumbJsonLd, itemListJsonLd } from "@bs/seo";

export const metadata: Metadata = {
  title: "Journal",
  description: "Original research and editorial essays from Build Something People Want. Named authors, 1500+ word pieces.",
  alternates: { canonical: abs("people", "/blog") },
};

export default function Page() {
  const posts = allArticles();
  return (
    <article className="prose">
      <JsonLd data={[
        breadcrumbJsonLd("people", [{ name: "Home", path: "/" }, { name: "Journal", path: "/blog" }]),
        itemListJsonLd("people", "Journal", posts.map((p) => ({ name: p.title, path: `/blog/${p.slug}` }))),
      ]} />
      <h1>The journal</h1>
      <p>
        Long-form English essays on Twin Scores, agentic publishing, and original 2026 research. Every piece has a named author. We do not publish thin listicles with invented user counts.
      </p>
      <h2>Essays</h2>
      <h3>Original research first</h3>
      <ul>
        {posts.map((p) => {
          const a = getAuthor(p.author);
          return (
            <li key={p.slug}>
              <Link href={`/blog/${p.slug}`}>{p.title}</Link> — {a?.name} · {p.publishedAt}
              <p>{p.description}</p>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
