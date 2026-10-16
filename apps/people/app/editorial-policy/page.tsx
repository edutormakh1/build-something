import type { Metadata } from "next";
import { JsonLd } from "@bs/ui";
import { abs, breadcrumbJsonLd } from "@bs/seo";

export const metadata: Metadata = {
  title: 'Editorial policy',
  description: 'Conflicts, review kinds, UGC rules, and how corrections work at Build Something People Want.',
  alternates: { canonical: abs("people", "/editorial-policy") },
  openGraph: { title: 'Editorial policy', description: 'Conflicts, review kinds, UGC rules, and how corrections work at Build Something People Want.' },
  twitter: { card: "summary_large_image", title: 'Editorial policy', description: 'Conflicts, review kinds, UGC rules, and how corrections work at Build Something People Want.' },
};

export default function Page() {
  return (
    <article className="prose">
      <JsonLd data={breadcrumbJsonLd("people", [{ name: "Home", path: "/" }, { name: 'Editorial policy', path: "/editorial-policy" }])} />
      
      <h1>Editorial policy</h1>
      <p>This directory is an editorial product. Reviews are labeled by kind: editorial, public_quote (editorial documentation paraphrases with source URL, not direct quotations or user testimony), user, or agent. Submissions are stored separately as pending when the submission service is configured. Public reviews are read from the committed catalog; approving a database row does not publish it here. No automated submission-to-publication workflow is enabled in this version. We never show fake UGC as authentic.</p>
      <h2>Independence</h2>
      <p>We do not sell stars. If a vendor later becomes a sponsor, the relationship will be labeled on the page. The public form does not offer an admin-role field. Database-side permission enforcement has not been verified by this editorial audit. Corrections go to editor@buildsomethingpeoplewant.com.</p>
      <h3>AI assistance</h3>
      <p>The bylines are catalog attributions; this evidence register contains agent documentation review dated 2026-10-16, with a responsible human editor unassigned. Professional history and firsthand product evaluations are not independently verified in this evidence register. Twin Scores are legacy editorial estimates on a 0–100 scale. No firsthand product-test log or per-dimension scoring worksheet is attached to these retained scores. Dated documentation checks establish only the specific product facts they cite; they do not validate the scores. The tables summarize committed catalog values, not firsthand measurements.</p>

    </article>
  );
}
