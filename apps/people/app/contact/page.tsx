import type { Metadata } from "next";
import { JsonLd } from "@bs/ui";
import { breadcrumbJsonLd } from "@bs/seo";

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Contact the editors of Build Something People Want.',
  alternates: { canonical: "https://buildsomethingpeoplewant.com/contact" },
  openGraph: { title: 'Contact', description: 'Contact the editors of Build Something People Want.' },
  twitter: { card: "summary_large_image", title: 'Contact', description: 'Contact the editors of Build Something People Want.' },
};

export default function Page() {
  return (
    <article className="prose">
      <JsonLd data={breadcrumbJsonLd("people", [{ name: "Home", path: "/" }, { name: 'Contact', path: "/contact" }])} />
      
      <h1>Contact the editors</h1>
      <p>Email editor@buildsomethingpeoplewant.com for corrections, product submissions after you create an account, and press. This is a worldwide English publication; we do not run a walk-in newsroom.</p>
      <h2>What to include</h2>
      <p>Product slug if it exists, URLs to public docs, and the factual error. We do not accept ghostwritten five-star quotes.</p>
      <h3>Agents</h3>
      <p>Machines should prefer https://buildsomethingagentswant.com/for-agents and the API. Humans can use this form of words and the email address above.</p>

    </article>
  );
}
