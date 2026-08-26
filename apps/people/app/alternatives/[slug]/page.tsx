import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allProducts, alternativesOf, getProduct } from "@bs/db";
import { JsonLd, TwinScore } from "@bs/ui";
import { breadcrumbJsonLd, itemListJsonLd } from "@bs/seo";

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() {
  return allProducts().map((p) => ({ slug: p.slug }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) return { title: "Not found" };
  return {
    title: `Alternatives to ${p.name}`,
    description: `Editorial alternatives to ${p.name} from the Twin Score catalog.`,
    alternates: { canonical: `https://buildsomethingpeoplewant.com/alternatives/${p.slug}` },
  };
}
export default async function Page({ params }: Props) {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) notFound();
  const alts = alternativesOf(p.slug);
  return (
    <article className="prose">
      <JsonLd data={[
        breadcrumbJsonLd("people", [{ name: "Home", path: "/" }, { name: `Alternatives to ${p.name}`, path: `/alternatives/${p.slug}` }]),
        itemListJsonLd("people", `Alternatives to ${p.name}`, alts.map((a) => ({ name: a.name, path: `/products/${a.slug}` }))),
      ]} />
      <h1>Alternatives to {p.name}</h1>
      <p>
        {p.name} is {p.vendor}&apos;s product. These alternatives are other published catalog entities that share a job-to-be-done. This is not an affiliate grid and not a paid inclusion list.
      </p>
      <h2>Shortlist</h2>
      <h3>Why these names</h3>
      <ul>
        {alts.map((a) => (
          <li key={a.slug}>
            <Link href={`/products/${a.slug}`}>{a.name}</Link> — human {a.twin.human}, agent {a.twin.agent}. {a.description}{" "}
            <Link href={`/compare/${p.slug}-vs-${a.slug}`}>Compare with {p.name}</Link>
          </li>
        ))}
      </ul>
      <TwinScore human={p.twin.human} agent={p.twin.agent} emphasize="human" />
    </article>
  );
}
