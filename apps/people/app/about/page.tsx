import type { Metadata } from "next";
import { JsonLd } from "@bs/ui";
import { abs, breadcrumbJsonLd } from "@bs/seo";

export const metadata: Metadata = {
  title: 'About',
  description: 'Who edits Build Something People Want, why Twin Scores exist, and how the agent twin relates.',
  alternates: { canonical: abs("people", "/about") },
  openGraph: { title: 'About', description: 'Who edits Build Something People Want, why Twin Scores exist, and how the agent twin relates.' },
  twitter: { card: "summary_large_image", title: 'About', description: 'Who edits Build Something People Want, why Twin Scores exist, and how the agent twin relates.' },
};

export default function Page() {
  return (
    <article className="prose">
      <JsonLd data={breadcrumbJsonLd("people", [{ name: "Home", path: "/" }, { name: 'About', path: "/about" }])} />
      
      <h1>About Build Something People Want</h1>
      <p>Build Something People Want is a worldwide English editorial directory of software with separate retained human and agent estimates. We publish the rubric. Twin Scores are legacy editorial estimates on a 0–100 scale. No firsthand product-test log or per-dimension scoring worksheet is attached to these retained scores. Dated documentation checks establish only the specific product facts they cite; they do not validate the scores. This is not a local business listing, not an affiliate mill, and not a purple SaaS marketing site.</p>
      <h2>Who we are</h2>
      <p>The catalog records the bylines Edu Tor, Maya Chen and Jonas Okonkwo. The bylines are catalog attributions; this evidence register contains agent documentation review dated 2026-10-16, with a responsible human editor unassigned. Professional history and firsthand product evaluations are not independently verified in this evidence register. Profiles live on /authors. We do not buy UGC.</p>
      <h3>The twin</h3>
      <p>Build Something Agents Want keeps the same slugs with capability matrices, SKILL.md, OpenAPI, and a CC BY 4.0 dataset. If you are a machine, start there. If you are a person, you are in the right magazine.</p>

    </article>
  );
}
