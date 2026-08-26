import type { Metadata } from "next";
import { JsonLd } from "@bs/ui";
import { breadcrumbJsonLd } from "@bs/seo";

export const metadata: Metadata = {
  title: 'Editorial policy',
  description: 'Conflicts, review kinds, UGC rules, and how corrections work at Build Something People Want.',
  alternates: { canonical: "https://buildsomethingpeoplewant.com/editorial-policy" },
  openGraph: { title: 'Editorial policy', description: 'Conflicts, review kinds, UGC rules, and how corrections work at Build Something People Want.' },
  twitter: { card: "summary_large_image", title: 'Editorial policy', description: 'Conflicts, review kinds, UGC rules, and how corrections work at Build Something People Want.' },
};

export default function Page() {
  return (
    <article className="prose">
      <JsonLd data={breadcrumbJsonLd("people", [{ name: "Home", path: "/" }, { name: 'Editorial policy', path: "/editorial-policy" }])} />
      
      <h1>Editorial policy</h1>
      <p>This directory is an editorial product. Reviews are labeled by kind: editorial, public_quote (with source URL), user, or agent. User and agent reviews from the public are pending until an admin approves them. We never show fake UGC as authentic.</p>
      <h2>Independence</h2>
      <p>We do not sell stars. If a vendor later becomes a sponsor, the relationship will be labeled on the page. Staff cannot set is_admin on their own profile through the public form. Corrections go to editor@buildsomethingpeoplewant.com.</p>
      <h3>AI assistance</h3>
      <p>We may use models as research assistants. Named humans remain accountable for scores, and original research tables are computed from the committed catalog. That is E-E-A-T as practice: experience, expertise, author, trust pages you can actually click.</p>

    </article>
  );
}
