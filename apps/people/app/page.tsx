import type { Metadata } from "next";
import Link from "next/link";
import { allCategories, allProducts, allArticles } from "@bs/db";
import { JsonLd } from "@bs/ui";
import { ProductCard } from "../components/product-card";
import { abs, itemListJsonLd, breadcrumbJsonLd, webPageJsonLd } from "@bs/seo";

export const metadata: Metadata = {
  alternates: { canonical: abs("people", "/") },
};

export default function HomePage() {
  const products = allProducts()
    .slice()
    .sort((a, b) => b.twin.human - a.twin.human)
    .slice(0, 12);
  const cats = allCategories();
  const posts = allArticles().slice(0, 4);
  return (
    <article>
      <div className="opening opening--mosaic">
        <div className="opening-backdrop" aria-hidden="true">
          {/* Preserve the supplied reference; framing belongs to CSS. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/art/catalog-mosaic-reference.png" alt="" aria-hidden="true" width="1298" height="506" loading="eager" fetchPriority="high" />
        </div>
        <div className="opening-copy">
          <h1>Find software for the way you work.</h1>
          <p className="standfirst">
            Explore products, comparisons and essays. Twin Scores are legacy editorial estimates.
          </p>
          <p className="hero-actions">
            <Link href="/products" className="btn">Explore products</Link>
          </p>
        </div>
      </div>
      <JsonLd
        data={[
          breadcrumbJsonLd("people", [{ name: "Home", path: "/" }]),
          webPageJsonLd(
            "people",
            "/",
            "Software scored for the humans who actually use it",
            "Worldwide editorial directory of software products scored for humans and agents. Twin Scores, named authors, no fake user reviews.",
          ),
          itemListJsonLd(
            "people",
            "Featured products",
            products.map((p) => ({ name: p.name, path: `/products/${p.slug}` })),
          ),
        ]}
      />
      <div className="prose">
      <h2>What Twin Scores are</h2>
      <p>
        Twin Scores are legacy editorial estimates on a 0–100 scale. No firsthand product-test log or per-dimension scoring worksheet is attached to these retained scores. Dated documentation checks establish only the specific product facts they cite; they do not validate the scores. The rubric is public on the scorecard. We do not emit AggregateRating for Twin Scores. A scored review uses its own audience score on the native 0–100 scale.
      </p>
      <h2>Featured products by human Twin Score</h2>
      </div>
      <div className="gallery-grid not-prose">
        {products.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
      <div className="prose">
      <h2>About the catalog</h2>
      <p>Editorial · Worldwide · English · Catalog attribution: Edu Tor</p>
      <p>
        Build Something People Want is a worldwide editorial directory of software products scored for humans and agents. We retain legacy editorial estimates, catalog bylines and essays — not crowdsourced star ratings or invented user counts. The twin site, Build Something Agents Want, keeps the same entity slugs for machines.
      </p>
      <p>
        Every product page answers a buying question in the opening paragraph, then walks H2 to H3 with a capability snapshot, pricing as publicly stated, and links to alternatives. Public catalog pages render from committed seed JSON, so the site is readable before secrets land — including by AI crawlers that do not execute JavaScript or a 3D canvas.
      </p>
      <h3>Why two sites</h3>
      <p>
        People and agents do not want the same page. People want prose, comparisons, and a magazine that does not look like purple SaaS. Agents want matrices, SKILL.md, CSV, and OpenAPI. Same graph, two contracts.
      </p>
      <h2>Categories</h2>
      <ul>
        {cats.map((c) => (
          <li key={c.slug}>
            <Link href={`/categories/${c.slug}`}>{c.name}</Link> — {c.short}{" "}
            <Link href={`/best/${c.slug}`}>Best {c.name}</Link>
          </li>
        ))}
      </ul>
      <h2>Catalog analysis and essays</h2>
      <p>
        Start with <Link href="/blog">the journal</Link> and the 2026 human-versus-agent software surfaces table. The tables summarize retained estimates; they do not validate product performance. The bylines are catalog attributions; this evidence register contains agent documentation review dated 2026-10-16, with a responsible human editor unassigned. Professional history and firsthand product evaluations are not independently verified in this evidence register. Recorded bylines: <Link href="/authors/edu-tor">Edu Tor</Link>, Maya Chen, Jonas Okonkwo.
      </p>
      <h3>Latest essays</h3>
      <ul>
        {posts.length ? posts.map((a) => (
          <li key={a.slug}>
            <Link href={`/blog/${a.slug}`}>{a.title}</Link>
          </li>
        )) : <li>Essays ship with the catalog seed. See /blog after articles land.</li>}
      </ul>
      <p>
        Agents should go to <a href={abs("agents", "/for-agents")}>Build Something Agents Want developer resources</a>.
        Public JSON API on this origin: <Link href="/api/v1/products">GET /api/v1/products</Link>
        {" · "}
        <Link href="/openapi.json">openapi.json</Link>
        {" · "}
        <Link href="/llms.txt">llms.txt</Link>
        . Errors use RFC 9457 <code>application/problem+json</code> with <code>code</code>, <code>detail</code>, and <code>status</code>.
      </p>
      </div>
    </article>
  );
}
