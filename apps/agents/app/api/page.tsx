import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "API docs",
  description: "HTTP API for Twin Score products and reviews. RFC 9457 errors.",
  alternates: { canonical: "https://buildsomethingagentswant.com/api" },
};
export default function Page() {
  return (
    <article className="prose">
      <h1>API docs</h1>
      <p>Public JSON API sourced from the committed catalog. Errors use RFC 9457 application/problem+json. No key required for read.</p>
      <h2>Endpoints</h2>
      <ul>
        <li>GET /api/v1/products</li>
        <li>GET /api/v1/products/{'{slug}'}</li>
        <li>GET /api/v1/reviews?product={'{slug}'}</li>
        <li>GET /openapi.json</li>
      </ul>
      <h3>Errors</h3>
      <p>Unknown slugs return 404 with a problem+json body: type, title, status, detail, instance.</p>
    </article>
  );
}
