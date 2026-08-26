import Link from "next/link";
import { TwinScore } from "@bs/ui";
import type { Product } from "@bs/db";

export function ProductCard({ product, titleTag = "h3" }: { product: Product; titleTag?: "h2" | "h3" }) {
  const Title = titleTag;
  return (
    <article className="card product-card">
      <span className="card-mark" aria-hidden="true">{product.logoText}</span>
      <p className="kicker">{product.category}</p>
      <Title className="card-title">
        <Link href={`/products/${product.slug}`}>{product.name}</Link>
      </Title>
      <p className="card-lede">{product.description}</p>
      <TwinScore human={product.twin.human} agent={product.twin.agent} emphasize="agent" />
      <p><Link href={`/skills/${product.slug}`}>SKILL.md</Link></p>
    </article>
  );
}
