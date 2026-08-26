import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  allProducts,
  alternativesOf,
  getAuthor,
  getProduct,
  reviewsFor,
} from "@bs/db";
import { Breadcrumbs, JsonLd, TwinScore } from "@bs/ui";
import {
  breadcrumbJsonLd,
  reviewJsonLd,
  softwareJsonLd,
} from "@bs/seo";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return allProducts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) return { title: "Not found" };
  const url = `https://buildsomethingpeoplewant.com/products/${p.slug}`;
  return {
    title: `${p.name} review and Twin Score`,
    description: p.description,
    alternates: { canonical: url },
    openGraph: { title: `${p.name} · Twin Score`, description: p.description, url },
    twitter: { card: "summary_large_image", title: p.name, description: p.description },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) notFound();
  const reviews = reviewsFor(p.slug);
  const alts = alternativesOf(p.slug);
  return (
    <article className="prose">
      <JsonLd
        data={[
          breadcrumbJsonLd("people", [
            { name: "Home", path: "/" },
            { name: "Products", path: "/products" },
            { name: p.name, path: `/products/${p.slug}` },
          ]),
          softwareJsonLd("people", p, reviews),
          ...reviews.map((r) => reviewJsonLd("people", p, r, getAuthor(r.author))),
        ]}
      />
      <Breadcrumbs
        items={[
          { href: "/", label: "Home" },
          { href: "/products", label: "Products" },
          { href: `/products/${p.slug}`, label: p.name },
        ]}
      />
      <p className="kicker">{p.vendor} · {p.category} · founded {p.founded}</p>
      <h1>{p.name} for humans</h1>
      <p>{p.longDescription}</p>
      <TwinScore human={p.twin.human} agent={p.twin.agent} updated={p.twin.updated} emphasize="human" />
      <p>
        Twin page for agents:{" "}
        <a href={`https://buildsomethingagentswant.com/products/${p.slug}`}>
          {p.name} on Build Something Agents Want
        </a>
        .
      </p>
      <h2>Capability matrix</h2>
      <p>
        This matrix is the same data agents see. MCP is listed only when a real surface exists — we do not fake a manifest.
      </p>
      <h3>API, MCP, CLI, docs, auth</h3>
      <table>
        <thead>
          <tr><th>Surface</th><th>Level</th></tr>
        </thead>
        <tbody>
          <tr><td>API</td><td>{p.capabilities.api}</td></tr>
          <tr><td>MCP</td><td>{p.capabilities.mcp}</td></tr>
          <tr><td>CLI</td><td>{p.capabilities.cli}</td></tr>
          <tr><td>Docs</td><td>{p.capabilities.docs}</td></tr>
          <tr><td>Auth</td><td>{p.capabilities.auth}</td></tr>
          <tr><td>SDKs</td><td>{p.capabilities.sdks.join(", ") || "none listed"}</td></tr>
        </tbody>
      </table>
      <h2>Pricing and facts</h2>
      <p>{p.pricing} Headquarters: {p.headquarters}. Official site: <a href={p.website}>{p.website}</a>.</p>
      <h3>Editorial reviews</h3>
      <ul>
        {reviews.map((r) => (
          <li key={r.slug}>
            <Link href={`/reviews/${r.slug}`}>{r.title}</Link> — {r.kind}
            {r.sourceUrl ? ` · source ${r.sourceName}` : " · staff"}
          </li>
        ))}
      </ul>
      <h2>Alternatives</h2>
      <ul>
        {alts.map((a) => (
          <li key={a.slug}>
            <Link href={`/products/${a.slug}`}>{a.name}</Link>{" "}
            (<Link href={`/compare/${[p.slug, a.slug].join("-vs-")}`}>compare</Link>)
          </li>
        ))}
      </ul>
      <p>
        <Link href={`/alternatives/${p.slug}`}>All alternatives to {p.name}</Link> ·{" "}
        <Link href={`/categories/${p.category}`}>{p.category}</Link> ·{" "}
        <Link href="/scorecard">Rubric</Link>
      </p>
    </article>
  );
}
