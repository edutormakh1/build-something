import type { Metadata } from "next";
import { JsonLd } from "@bs/ui";
import { breadcrumbJsonLd, webPageJsonLd } from "@bs/seo";

export const metadata: Metadata = {
  title: 'Methodology',
  description: 'How Twin Scores are assigned, what sources we use, and what we refuse to invent.',
  alternates: { canonical: "https://buildsomethingpeoplewant.com/methodology" },
  openGraph: { title: 'Methodology', description: 'How Twin Scores are assigned, what sources we use, and what we refuse to invent.' },
  twitter: { card: "summary_large_image", title: 'Methodology', description: 'How Twin Scores are assigned, what sources we use, and what we refuse to invent.' },
};

export default function Page() {
  return (
    <article className="prose">
      <JsonLd data={[
        breadcrumbJsonLd("people", [{ name: "Home", path: "/" }, { name: "Methodology", path: "/methodology" }]),
        webPageJsonLd("people", "/methodology", "How Twin Scores are made", "How Twin Scores are assigned, what sources we use, and what we refuse to invent."),
      ]} />
      
      <h1>How Twin Scores are made</h1>
      <p>Twin Scores are editorial 0–100 composites on a public rubric, assigned by named staff using public products, public documentation, and public pricing pages. We do not scrape app-store stars, we do not invent user counts, and we do not sell placement on /best pages.</p>
      <h2>Sources and limits</h2>
      <p>Each product page states vendor, founded year, headquarters, and pricing as publicly described. Enterprise quote-only SKUs are labeled as such. Self-hosted versus SaaS editions may be collapsed into one entity with a note. Scores carry an updated date in the seed JSON.</p>
      <h3>What we will not do</h3>
      <p>We will not list an MCP server that does not exist, we will not mark fake UGC as authentic, and we do not emit AggregateRating for Twin Scores. A scored review uses its own audience score on the native 0–100 scale. Read the editorial policy and the scorecard alongside this page.</p>

    </article>
  );
}
