import Link from "next/link";
import { allProducts } from "@bs/db";
import { JsonLd, TwinScore } from "@bs/ui";
import { breadcrumbJsonLd, itemListJsonLd } from "@bs/seo";

export default function Page() {
  const products = allProducts().slice().sort((a, b) => b.twin.agent - a.twin.agent).slice(0, 12);
  return (
    <article className="prose">
      <JsonLd data={[
        breadcrumbJsonLd("agents", [{ name: "Home", path: "/" }]),
        itemListJsonLd("agents", "Highest agent Twin Scores", products.map((p) => ({ name: p.name, path: `/products/${p.slug}` }))),
      ]} />
      <p className="kicker">same entity graph · different contract</p>
      <h1>A catalog for agents, not a reskinned brochure</h1>
      <p>
        Build Something Agents Want is the machine-first twin of Build Something People Want. Same product slugs, Twin Scores, and editorial rules — capability matrices, SKILL.md, OpenAPI, and a CC BY 4.0 dataset instead of magazine prose. We do not ship a fake MCP manifest.
      </p>
      <p>
        Use this site when you need to call an API, write a skill file, or download scores. Use the people twin when you need a comparison essay. Developer resources are titled “Build Something Agents Want developer resources”.
      </p>
      <h2>Highest agent Twin Scores</h2>
      <h3>Editorial, not user-count ratings</h3>
      <div className="grid-cards not-prose">
        {products.map((p) => (
          <article key={p.slug} className="card">
            <h2 className="text-lg"><Link href={`/products/${p.slug}`}>{p.name}</Link></h2>
            <TwinScore human={p.twin.human} agent={p.twin.agent} emphasize="agent" />
            <p><Link href={`/skills/${p.slug}`}>SKILL.md</Link></p>
          </article>
        ))}
      </div>
      <p><Link href="/for-agents">Build Something Agents Want developer resources</Link> · <Link href="/dataset/twin-scores.json">JSON dataset</Link></p>
    </article>
  );
}
