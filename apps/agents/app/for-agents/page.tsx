import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@bs/ui";
import { abs, breadcrumbJsonLd, datasetJsonLd, webPageJsonLd } from "@bs/seo";

export const metadata: Metadata = {
  title: "Build Something Agents Want developer resources",
  description:
    "Developer resources for the Twin Score catalog: API, SKILL.md, dataset, OpenAPI, llms.txt. When to use and when not.",
  alternates: { canonical: abs("agents", "/for-agents") },
};

export default function Page() {
  return (
    <article className="prose">
      <JsonLd
        data={[
          breadcrumbJsonLd("agents", [
            { name: "Home", path: "/" },
            { name: "Developer resources", path: "/for-agents" },
          ]),
          webPageJsonLd(
            "agents",
            "/for-agents",
            "Build Something Agents Want developer resources",
            "API, SKILL.md, CC BY Twin Score dataset, OpenAPI, llms.txt. Machine contracts for the catalog.",
          ),
          datasetJsonLd(),
        ]}
      />
      <h1>Build Something Agents Want developer resources</h1>
      <p>
        This page is the named developer-resources hub for the product. Use it when you need machine contracts for the Twin Score catalog: slugs, scores, capability matrices, SKILL.md, OpenAPI, and a CC BY 4.0 dataset. Do not use it when you need a human comparison essay — that is the people twin.
      </p>
      <h2>When to use</h2>
      <ul>
        <li>GET /api/v1/products and /api/v1/products/{"{slug}"}</li>
        <li>GET /api/v1/reviews?product={"{slug}"}</li>
        <li>OpenAPI at /openapi.json with RFC 9457 errors on misses</li>
        <li>SKILL.md at /skills/{"{slug}"} and /.well-known/agent-skills/index.json</li>
        <li>Dataset /dataset/twin-scores.json and .csv (CC BY 4.0)</li>
        <li>llms.txt and llms-full.txt</li>
        <li>Accept: text/markdown on canonical HTML pages</li>
      </ul>
      <h3>When not to use</h3>
      <p>
        No unofficial MCP is advertised. No fake UGC. No Argentina-only geo pages. A 3D canvas, if present, is decoration; the facts on this page are in the HTML. Accept: text/markdown is honored unless Next RSC headers are present.
      </p>
      <p>
        <Link href="/api">API docs</Link> · <Link href="/scorecard">Rubric</Link> ·{" "}
        <Link href="/methodology">Methodology</Link>
      </p>
    </article>
  );
}
