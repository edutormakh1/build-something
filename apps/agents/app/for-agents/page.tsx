import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Build Something Agents Want developer resources",
  description: "Developer resources for the Twin Score catalog: API, SKILL.md, dataset, OpenAPI, llms.txt. When to use and when not.",
  alternates: { canonical: "https://buildsomethingagentswant.com/for-agents" },
};

export default function Page() {
  return (
    <article className="prose">
      <h1>Build Something Agents Want developer resources</h1>
      <p>
        This page is the named developer-resources hub for the product. Use it when you need machine contracts for the Twin Score catalog. Do not use it when you need a human comparison essay — that is the people twin.
      </p>
      <h2>When to use</h2>
      <ul>
        <li>GET /api/v1/products and /api/v1/products/{'{slug}'}</li>
        <li>GET /api/v1/reviews?product={'{slug}'}</li>
        <li>OpenAPI at /openapi.json with RFC 9457 errors on misses</li>
        <li>SKILL.md at /skills/{'{slug}'} and /.well-known/agent-skills/index.json</li>
        <li>Dataset /dataset/twin-scores.json and .csv (CC BY 4.0)</li>
        <li>llms.txt and llms-full.txt</li>
      </ul>
      <h3>When not to use</h3>
      <p>No unofficial MCP is advertised. No fake UGC. No Argentina-only geo pages. Accept: text/markdown is honored unless Next RSC headers are present.</p>
      <p><Link href="/api">API docs</Link> · <Link href="/scorecard">Rubric</Link></p>
    </article>
  );
}
