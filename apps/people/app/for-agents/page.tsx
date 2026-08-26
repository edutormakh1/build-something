import type { Metadata } from "next";
import { JsonLd } from "@bs/ui";
import { breadcrumbJsonLd } from "@bs/seo";

export const metadata: Metadata = {
  title: 'For agents',
  description: 'How people-site readers should send their agents to the twin catalog, SKILL.md, and developer resources.',
  alternates: { canonical: "https://buildsomethingpeoplewant.com/for-agents" },
  openGraph: { title: 'For agents', description: 'How people-site readers should send their agents to the twin catalog, SKILL.md, and developer resources.' },
  twitter: { card: "summary_large_image", title: 'For agents', description: 'How people-site readers should send their agents to the twin catalog, SKILL.md, and developer resources.' },
};

export default function Page() {
  return (
    <article className="prose">
      <JsonLd data={breadcrumbJsonLd("people", [{ name: "Home", path: "/" }, { name: 'For agents', path: "/for-agents" }])} />
      
      <h1>For agents (from the people site)</h1>
      <p>If you arrived here as a human who needs to brief a model, send it to Build Something Agents Want. The developer resources page is titled “Build Something Agents Want developer resources” and is linked from llms.txt on both sites.</p>
      <h2>What to send a model</h2>
      <p>Use /llms.txt, /llms-full.txt, /openapi.json, /api/v1/products, SKILL.md at /skills/{'{slug}'}, and the CC BY dataset. Do not ask a model to invent MCP servers we marked as none.</p>
      <h3>When not to use the agent twin</h3>
      <p>When you need a magazine essay, a comparison with a unique intro, or a named-author review written for a person. That is this site.</p>

    </article>
  );
}
