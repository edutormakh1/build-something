import type { Metadata } from "next";
import { JsonLd } from "@bs/ui";
import { abs, breadcrumbJsonLd, peopleContactContent } from "@bs/seo";

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Contact the editors of Build Something People Want.',
  alternates: { canonical: abs("people", "/contact") },
  openGraph: { title: 'Contact', description: 'Contact the editors of Build Something People Want.' },
  twitter: { card: "summary_large_image", title: 'Contact', description: 'Contact the editors of Build Something People Want.' },
};

export default function Page() {
  return (
    <article className="prose">
      <JsonLd data={breadcrumbJsonLd("people", [{ name: "Home", path: "/" }, { name: 'Contact', path: "/contact" }])} />
      
      <h1>{peopleContactContent.title}</h1>
      <p>{peopleContactContent.openingParagraph}</p>
      <h2>{peopleContactContent.whatToIncludeHeading}</h2>
      <p>{peopleContactContent.whatToIncludeParagraph}</p>
      <h3>{peopleContactContent.agentsHeading}</h3>
      <p>{peopleContactContent.agentsParagraphPrefix}{abs("agents", "/for-agents")}{peopleContactContent.agentsParagraphSuffix}</p>

    </article>
  );
}
