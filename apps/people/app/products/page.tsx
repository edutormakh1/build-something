import Link from "next/link";
import type { Metadata } from "next";
import { allProducts } from "@bs/db";
import { TwinScore, JsonLd } from "@bs/ui";
import { itemListJsonLd, breadcrumbJsonLd } from "@bs/seo";

export const metadata: Metadata = {
  title: "All products",
  description:
    "Browse 70+ worldwide software products with editorial Twin Scores for humans and agents. Not a star-rating marketplace.",
  alternates: { canonical: "https://buildsomethingpeoplewant.com/products" },
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
    <article className="prose">
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
      <div className="grid-cards not-prose">
        {products.map((p) => (
          <article key={p.slug} className="card">
            <h2 className="text-lg">
              <Link href={`/products/${p.slug}`}>{p.name}</Link>
            </h2>
            <p className="text-sm">{p.vendor} · {p.category}</p>
            <TwinScore human={p.twin.human} agent={p.twin.agent} emphasize="human" />
          </article>
        ))}
      </div>
    </article>
  );
}
