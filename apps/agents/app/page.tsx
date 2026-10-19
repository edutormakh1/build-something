import type { Metadata } from "next";
import Link from "next/link";
import { allProducts } from "@bs/db";
import { JsonLd } from "@bs/ui";
import { abs, breadcrumbJsonLd, itemListJsonLd } from "@bs/seo";
import { ProductCard } from "../components/product-card";

export const metadata: Metadata = {
  alternates: { canonical: abs("agents", "/") },
};

export default function Page() {
  const products = allProducts().slice().sort((a, b) => b.twin.agent - a.twin.agent).slice(0, 12);
  return (
    <article>
      <div className="opening opening--mosaic">
        <div className="opening-backdrop" aria-hidden="true">
          {/* Preserve the supplied reference; framing belongs to CSS. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/art/catalog-mosaic-reference.png" alt="" aria-hidden="true" width="1298" height="506" loading="eager" fetchPriority="high" />
        </div>
        <div className="opening-copy">
          <h1>Find software your agents can use.</h1>
          <p className="standfirst">
            Capability matrices, SKILL.md, OpenAPI and downloadable catalog data.
          </p>
          <p className="hero-actions">
            <Link href="/products" className="btn">Browse catalog</Link>
            <Link href="/for-agents">Developer resources</Link>
          </p>
        </div>
      </div>
      <JsonLd data={[
        breadcrumbJsonLd("agents", [{ name: "Home", path: "/" }]),
        itemListJsonLd("agents", "Highest agent Twin Scores", products.map((p) => ({ name: p.name, path: `/products/${p.slug}` }))),
      ]} />
      <div className="prose">
        <h2>Developer resources</h2>
        <p>Twin Scores are legacy editorial estimates on a 0–100 scale. No firsthand product-test log or per-dimension scoring worksheet is attached to these retained scores. Dated documentation checks establish only the specific product facts they cite; they do not validate the scores.</p>
        <div className="contracts not-prose">
          <Link className="card" href="/for-agents">
            <p className="kicker">Skill files</p>
            <h3 className="card-title">SKILL.md</h3>
            <p className="card-lede">When to use, when not. Real files, not a fake MCP listing.</p>
          </Link>
          <Link className="card" href="/api">
            <p className="kicker">HTTP</p>
            <h3 className="card-title">OpenAPI</h3>
            <p className="card-lede">JSON API with RFC 9457 errors. No key for read.</p>
          </Link>
          <Link className="card" href="/dataset/twin-scores.json">
            <p className="kicker">CC BY 4.0</p>
            <h3 className="card-title">Dataset</h3>
            <p className="card-lede">Twin Scores as JSON and CSV. The exports reproduce summaries and gaps from final catalog estimates; they do not contain the original scoring observations.</p>
          </Link>
          <Link className="card" href="/llms.txt">
            <p className="kicker">Negotiation</p>
            <h3 className="card-title">llms.txt</h3>
            <p className="card-lede">Markdown on Accept. The hall stays machine-readable.</p>
          </Link>
        </div>
        <h2>Highest agent Twin Scores</h2>
        <p>Editorial, not user-count ratings.</p>
      </div>
      <div className="gallery-grid not-prose">
        {products.map((p) => (
          <ProductCard key={p.slug} product={p} titleTag="h3" />
        ))}
      </div>
      <div className="prose">
        <h2>About the catalog</h2>
        <p>The catalog records the bylines Edu Tor, Maya Chen and Jonas Okonkwo. Their professional history and firsthand product evaluations are not independently verified in this evidence register. The bylines are catalog attributions; this evidence register contains agent documentation review dated 2026-10-16, with a responsible human editor unassigned.</p>
        <p>
          Build Something Agents Want is the machine-first twin of Build Something People Want. Same product slugs, Twin Scores, and editorial rules. Use this site when you need to call an API, write a skill file, or download scores. Use the people twin when you need a comparison essay. Developer resources are titled “Build Something Agents Want developer resources”.
        </p>
        <p>
          Public JSON API: <Link href="/api/v1/products">GET /api/v1/products</Link>
          {" · "}
          <Link href="/api/v1/products/chatgpt">GET /api/v1/products/chatgpt</Link>
          {" · "}
          <Link href="/openapi.json">openapi.json</Link>
          {" · "}
          <Link href="/llms.txt">llms.txt</Link>
          . Errors are RFC 9457 <code>application/problem+json</code> with <code>code</code>, <code>detail</code>, and <code>status</code> (400/404/405 on <code>/api/v1/*</code>).
        </p>
      </div>
      <p className="prose">
        <Link href="/for-agents">Build Something Agents Want developer resources</Link>
        {" · "}
        <Link href="/dataset/twin-scores.json">JSON dataset</Link>
        {" · "}
        <Link href="/api/v1/products">JSON API</Link>
        {" · "}
        <Link href="/openapi.json">OpenAPI</Link>
      </p>
    </article>
  );
}
