import Link from "next/link";
import type { Metadata } from "next";
import { allProducts } from "@bs/db";
import { JsonLd } from "@bs/ui";
import { abs, itemListJsonLd, breadcrumbJsonLd } from "@bs/seo";
import { ProductCard } from "../../components/product-card";

export const metadata: Metadata = {
  title: "All products",
  description:
    "Browse 70+ worldwide software products with editorial Twin Scores for humans and agents. Not a star-rating marketplace.",
  alternates: { canonical: abs("people", "/products") },
};

export default function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  return <Inner searchParams={searchParams} />;
}

async function Inner({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q || "").trim().toLowerCase();
  let products = allProducts();
  if (q) {
    products = products.filter((p) =>
      [p.name, p.vendor, p.description, p.slug, ...p.tags].join(" ").toLowerCase().includes(q),
    );
  }
  return (
    <article>
      <JsonLd
        data={[
          breadcrumbJsonLd("people", [
            { name: "Home", path: "/" },
            { name: "Products", path: "/products" },
          ]),
          itemListJsonLd(
            "people",
            "Product directory",
            products.map((p) => ({ name: p.name, path: `/products/${p.slug}` })),
          ),
        ]}
      />
      <div className="prose">
        <h1>All products in the Twin Score directory</h1>
        <p>
          This index lists every published product in Build Something People Want. Scores are editorial Twin Scores, not user-count ratings. Search filters the committed catalog; we do not hide products behind a JavaScript-only wall.
        </p>
        <form method="get" action="/products" className="not-prose my-4">
          <label htmlFor="q">Search products</label>
          <input id="q" name="q" defaultValue={sp.q || ""} placeholder="chatgpt, stripe, figma" />
          <button type="submit">Search</button>
        </form>
        <h2>Published catalog</h2>
        <h3>{products.length} matches</h3>
      </div>
      <div className="gallery-grid not-prose">
        {products.map((p) => (
          <ProductCard key={p.slug} product={p} titleTag="h2" />
        ))}
      </div>
    </article>
  );
}
