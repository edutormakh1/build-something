import { abs } from "@bs/seo";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "API docs",
  description: "HTTP API for Twin Score products and reviews. RFC 9457 errors with code, detail, and status.",
  alternates: { canonical: abs("agents", "/api") },
};

export default function Page() {
  return (
    <article className="prose">
      <h1>API docs</h1>
      <p>
        Public JSON API sourced from the committed catalog. Errors use RFC 9457 <code>application/problem+json</code> with
        a stable <code>code</code>, <code>detail</code>, and <code>status</code>. No key required for read.
      </p>
      <p>Twin Scores are legacy editorial estimates on a 0–100 scale. No firsthand product-test log or per-dimension scoring worksheet is attached to these retained scores. Dated documentation checks establish only the specific product facts they cite; they do not validate the scores.</p>
      <p>The bylines are catalog attributions; this evidence register contains agent documentation review dated 2026-10-16, with a responsible human editor unassigned.</p>
      <p>Numeric scores and capability grades are retained catalog judgments, not verified product-quality results. Dataset JSON includes rubric notes; CSV retains the numeric estimates. The exports reproduce summaries and gaps from final catalog estimates; they do not contain the original scoring observations.</p>
      <h2>Endpoints</h2>
      <ul>
        <li><Link href="/api/v1">GET /api/v1</Link> — discovery</li>
        <li><Link href="/api/v1/products">GET /api/v1/products</Link></li>
        <li><Link href="/api/v1/products/chatgpt">GET /api/v1/products/{"{slug}"}</Link></li>
        <li><Link href="/api/v1/reviews?product=chatgpt">GET /api/v1/reviews?product={"{slug}"}</Link></li>
        <li><Link href="/openapi.json">GET /openapi.json</Link></li>
        <li><Link href="/.well-known/api-catalog">GET /.well-known/api-catalog</Link></li>
      </ul>
      <h3>Errors</h3>
      <p>
        Unknown routes and slugs return 404, invalid slugs return 400, and unsupported methods return 405 — all as
        problem+json. See <Link href="/llms.txt">llms.txt</Link> and{" "}
        <Link href="/for-agents">Build Something Agents Want developer resources</Link>.
      </p>
    </article>
  );
}
