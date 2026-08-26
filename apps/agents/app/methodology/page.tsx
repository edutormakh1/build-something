import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@bs/ui";
import { breadcrumbJsonLd, webPageJsonLd } from "@bs/seo";

export const metadata: Metadata = {
  title: "Agent-side methodology",
  description:
    "Agent Twin Scores weight API quality, MCP or tool surface, CLI, structured docs, machine auth, quotas, determinism, and skill packaging. Named staff assign them from public docs.",
  alternates: { canonical: "https://buildsomethingagentswant.com/methodology" },
};

export default function Page() {
  return (
    <article className="prose">
      <JsonLd
        data={[
          breadcrumbJsonLd("agents", [
            { name: "Home", path: "/" },
            { name: "Methodology", path: "/methodology" },
          ]),
          webPageJsonLd(
            "agents",
            "/methodology",
            "Agent-side methodology",
            "How agent Twin Scores are assigned from public APIs, docs, and skill packaging — named staff, no fake UGC.",
          ),
        ]}
      />
      <p className="kicker">Who · How · Why · Edu Tor</p>
      <h1>Agent-side methodology</h1>
      <p>
        Agent Twin Scores are editorial 0–100 composites that weight API quality, MCP or tool surface, CLI, structured docs, machine auth, quotas, determinism, and skill packaging. Named staff assign them from public products and public documentation — not from invented user counts and not from a 3D canvas.
      </p>
      <h2>Who, how, and why</h2>
      <p>
        Who: Edu Tor (editor), with staff writers Maya Chen and Jonas Okonkwo on the people twin. How: public apps, official docs, pricing pages, and capability matrices in the committed catalog. Why: a citable machine contract, not search bait.
      </p>
      <h3>SKILL.md and the dataset</h3>
      <p>
        Each product has a real SKILL.md derived from catalog facts, with explicit when-to-use and when-not-to-use. Download JSON/CSV under CC BY 4.0 from{" "}
        <Link href="/dataset/twin-scores.json">/dataset/twin-scores.json</Link> and recompute. Rubric: <Link href="/scorecard">scorecard</Link>.
      </p>
    </article>
  );
}
