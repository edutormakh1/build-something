import type { Metadata } from "next";
import { JsonLd } from "@bs/ui";
import { breadcrumbJsonLd } from "@bs/seo";

export const metadata: Metadata = {
  title: 'Twin Score rubric',
  description: 'Public rubric for human and agent Twin Scores, with weights and a downloadable dataset.',
  alternates: { canonical: "https://buildsomethingpeoplewant.com/scorecard" },
  openGraph: { title: 'Twin Score rubric', description: 'Public rubric for human and agent Twin Scores, with weights and a downloadable dataset.' },
  twitter: { card: "summary_large_image", title: 'Twin Score rubric', description: 'Public rubric for human and agent Twin Scores, with weights and a downloadable dataset.' },
};

export default function Page() {
  return (
    <article className="prose">
      <JsonLd data={breadcrumbJsonLd("people", [{ name: "Home", path: "/" }, { name: 'Twin Score rubric', path: "/scorecard" }])} />
      
      <h1>Twin Score rubric</h1>
      <p>Twin Scores are two editorial numbers, not a five-star widget with a made-up rater count. Human dimensions: interface, onboarding, human docs, collaboration, support, pricing fairness, accessibility, reliability. Agent dimensions: API, MCP or tools, CLI, structured docs, machine auth, quotas, determinism, skill packaging.</p>
      <h2>Weights</h2>
      <p>See the committed catalog JSON for exact weights. Scores are 0–100 composites. JSON-LD AggregateRating, when present, is those staff scores scaled to 5, with reviewCount equal to editorial reviews — never a fake user total.</p>
      <h3>Download</h3>
      <p>CSV and JSON live on the agents twin: <a href="https://buildsomethingagentswant.com/dataset/twin-scores.json">twin-scores.json</a> and the CSV sibling. License: CC BY 4.0.</p>

    </article>
  );
}
