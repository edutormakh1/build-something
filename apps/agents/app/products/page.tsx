import type { Metadata } from "next";
import { allProducts } from "@bs/db";
import { JsonLd } from "@bs/ui";
import { breadcrumbJsonLd, itemListJsonLd } from "@bs/seo";
import { ProductCard } from "../../components/product-card";

export const metadata: Metadata = {
  title: "Products",
  description: "Machine-first index of Twin Score products with API/MCP/CLI/docs/auth matrices.",
  alternates: { canonical: "https://buildsomethingagentswant.com/products" },
};

export default function Page() {
  const products = allProducts();
  return (
    <article>
      <div className="piece-head">
        <p className="kicker">{products.length} entities · same slugs as the people twin</p>
        <h1>All products (agent view)</h1>
        <p className="standfirst">Every published entity from the committed seed JSON. Approach a plaque for the capability matrix and SKILL.md. MCP is omitted unless it actually exists.</p>
      </div>
      <JsonLd data={[
        breadcrumbJsonLd("agents", [{ name: "Home", path: "/" }, { name: "Products", path: "/products" }]),
        itemListJsonLd("agents", "Products", products.map((p) => ({ name: p.name, path: `/products/${p.slug}` }))),
      ]} />
      <h2>Index</h2>
      <h3>{products.length} entities</h3>
      <div className="gallery-grid">
        {products.map((p) => (
          <ProductCard key={p.slug} product={p} titleTag="h2" />
        ))}
      </div>
    </article>
  );
}
