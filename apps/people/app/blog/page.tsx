import Link from "next/link";
import type { Metadata } from "next";
import { allArticles, getAuthor } from "@bs/db";
import { JsonLd } from "@bs/ui";
import { abs, breadcrumbJsonLd, itemListJsonLd } from "@bs/seo";

export const metadata: Metadata = {
  title: "Journal",
  description: "Editorial essays and analysis of retained Twin Score estimates from Build Something People Want. Bylines are catalog attributions; firsthand product testing is not documented.",
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
        Long-form English essays on Twin Scores and agentic publishing. The articles summarize retained editorial estimates and documented product facts. Bylines are catalog attributions, not verified identities or credentials. We do not publish thin listicles with invented user counts.
      </p>
      <h2>Essays</h2>
      <h3>Catalog analysis and evidence limits</h3>
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
