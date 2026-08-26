import Link from "next/link";
import { allCategories, allProducts, allArticles } from "@bs/db";
import { JsonLd } from "@bs/ui";
import { ProductCard } from "../components/product-card";
import { itemListJsonLd, breadcrumbJsonLd, webPageJsonLd } from "@bs/seo";

export default function HomePage() {
  const products = allProducts()
    .slice()
    .sort((a, b) => b.twin.human - a.twin.human)
    .slice(0, 12);
  const cats = allCategories();
  const posts = allArticles().slice(0, 4);
  return (
    <article>
      <div className="opening">
        <p className="kicker">Editorial · Worldwide · English · Edited by Edu Tor</p>
        <h1>Software scored for the humans who actually use it</h1>
        <p className="standfirst">
          A worldwide gallery of products people actually want. Twin Scores, named authors, no fake user reviews.
        </p>
        <p className="hero-actions">
          <Link href="/products" className="btn">Walk the gallery</Link>
          <Link href="/signup" className="btn ghost">Come in</Link>
        </p>
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
      <p>
        Build Something People Want is a worldwide editorial directory of software products scored for humans and agents. We publish original Twin Scores, named-author reviews, and research — not crowdsourced star ratings and not invented user counts. The twin site, Build Something Agents Want, keeps the same entity slugs for machines.
      </p>
      <p>
        Every product page answers a buying question in the opening paragraph, then walks H2 to H3 with a capability snapshot, pricing as publicly stated, and links to alternatives. Public catalog pages render from committed seed JSON, so the site is readable before secrets land — including by AI crawlers that do not execute JavaScript or a 3D canvas.
      </p>
      <h2>What Twin Scores are</h2>
      <p>
        A Twin Score is two editorial numbers from 0 to 100: one for the human surface, one for the agent surface. The rubric is public on the scorecard. AggregateRating in our JSON-LD is only those staff composites, never a fake reviewCount from anonymous users.
      </p>
      <h3>Why two sites</h3>
      <p>
        People and agents do not want the same page. People want prose, comparisons, and a magazine that does not look like purple SaaS. Agents want matrices, SKILL.md, CSV, and OpenAPI. Same graph, two contracts.
      </p>
      <h2>Featured products by human Twin Score</h2>
      </div>
      <div className="gallery-grid not-prose">
        {products.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
      <div className="prose">
      <h2>Categories</h2>
      <ul>
        {cats.map((c) => (
          <li key={c.slug}>
            <Link href={`/categories/${c.slug}`}>{c.name}</Link> — {c.short}{" "}
            <Link href={`/best/${c.slug}`}>Best {c.name}</Link>
          </li>
        ))}
      </ul>
      <h2>Original research</h2>
      <p>
        Start with <Link href="/blog">the journal</Link> and the 2026 human-versus-agent software surfaces table. Methodology and editorial policy sit in the masthead so E-E-A-T is a page, not a claim. Named authors: <Link href="/authors/edu-tor">Edu Tor</Link>, Maya Chen, Jonas Okonkwo.
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
        Agents should go to <a href="https://buildsomethingagentswant.com/for-agents">Build Something Agents Want developer resources</a>.
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
