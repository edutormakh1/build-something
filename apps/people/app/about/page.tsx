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
      <p>Build Something People Want is a worldwide English editorial directory of software, edited by Edu Tor. We score products twice — once for humans, once for agents — and we publish the rubric. This is not a local business listing, not an affiliate mill, and not a purple SaaS marketing site.</p>
      <h2>Who we are</h2>
      <p>Edu Tor is founder and editor-in-chief. Staff writers Maya Chen (developer tools) and Jonas Okonkwo (AI products) file named reviews. Bios live on /authors. We use public apps and public docs. We do not buy UGC.</p>
      <h3>The twin</h3>
      <p>Build Something Agents Want keeps the same slugs with capability matrices, SKILL.md, OpenAPI, and a CC BY 4.0 dataset. If you are a machine, start there. If you are a person, you are in the right magazine.</p>

    </article>
  );
}
