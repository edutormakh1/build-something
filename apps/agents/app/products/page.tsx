import Link from "next/link";
import type { Metadata } from "next";
import { allProducts } from "@bs/db";
import { JsonLd, TwinScore } from "@bs/ui";
import { breadcrumbJsonLd, itemListJsonLd } from "@bs/seo";

export const metadata: Metadata = {
  title: "Products",
  description: "Machine-first index of Twin Score products with API/MCP/CLI/docs/auth matrices.",
  alternates: { canonical: "https://buildsomethingagentswant.com/products" },
};

export default function Page() {
  const products = allProducts();
  return (
    <article className="prose">
      <JsonLd data={[
        breadcrumbJsonLd("agents", [{ name: "Home", path: "/" }, { name: "Products", path: "/products" }]),
        itemListJsonLd("agents", "Products", products.map((p) => ({ name: p.name, path: `/products/${p.slug}` }))),
      ]} />
      <h1>All products (agent view)</h1>
      <p>Every published entity from the committed seed JSON. Click through for the capability matrix and SKILL.md. MCP is omitted unless it actually exists.</p>
      <h2>Index</h2>
      <h3>{products.length} entities</h3>
      <div className="grid-cards not-prose">
        {products.map((p) => (
          <article key={p.slug} className="card">
            <h2 className="text-lg"><Link href={`/products/${p.slug}`}>{p.name}</Link></h2>
            <p className="text-sm">API {p.capabilities.api} · CLI {p.capabilities.cli} · MCP {p.capabilities.mcp}</p>
            <TwinScore human={p.twin.human} agent={p.twin.agent} emphasize="agent" />
          </article>
        ))}
      </div>
    </article>
  );
}
