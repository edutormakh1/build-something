import type { Metadata } from "next";
import { JsonLd } from "@bs/ui";
import { abs, breadcrumbJsonLd, webPageJsonLd } from "@bs/seo";

export const metadata: Metadata = {
  title: 'Methodology',
  description: 'How Twin Scores are assigned, what sources we use, and what we refuse to invent.',
  alternates: { canonical: abs("people", "/methodology") },
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
      <p>Twin Scores are legacy editorial estimates on a 0–100 scale. No firsthand product-test log or per-dimension scoring worksheet is attached to these retained scores. Dated documentation checks establish only the specific product facts they cite; they do not validate the scores. The bylines are catalog attributions; this evidence register contains agent documentation review dated 2026-10-16, with a responsible human editor unassigned. Professional history and firsthand product evaluations are not independently verified in this evidence register. We do not scrape app-store stars, we do not invent user counts, and we do not sell placement on /best pages.</p>
      <h2>Sources and limits</h2>
      <p>The catalog retains vendor, founded-year, headquarters and pricing fields; only dated documentation checks support the specific facts they cite. Original catalog score dates are not dates of this audit. The exports reproduce summaries and gaps from final estimates; they do not contain the original scoring observations. Account submissions are separate and do not publish automatically.</p>
      <h3>What we will not do</h3>
      <p>We will not list an MCP server that does not exist, we will not mark fake UGC as authentic, and we do not emit AggregateRating for Twin Scores. A scored review uses its own audience score on the native 0–100 scale. Read the editorial policy and the scorecard alongside this page.</p>

    </article>
  );
}
