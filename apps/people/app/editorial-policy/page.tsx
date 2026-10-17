import type { Metadata } from "next";
import { JsonLd } from "@bs/ui";
import { abs, breadcrumbJsonLd, peopleEditorialPolicyContent } from "@bs/seo";

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
      
      <h1>{peopleEditorialPolicyContent.title}</h1>
      <p>{peopleEditorialPolicyContent.openingParagraph}</p>
      <h2>{peopleEditorialPolicyContent.independenceHeading}</h2>
      <p>{peopleEditorialPolicyContent.independenceParagraph}</p>
      <h3>{peopleEditorialPolicyContent.aiAssistanceHeading}</h3>
      <p>{peopleEditorialPolicyContent.aiAssistanceParagraph}</p>

    </article>
  );
}
