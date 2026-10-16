import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@bs/ui";
import { abs, breadcrumbJsonLd, webPageJsonLd } from "@bs/seo";

export const metadata: Metadata = {
  title: "Agent-side methodology",
  description:
    "The intended agent rubric weights API quality, MCP or tool surface, CLI, structured docs, machine auth, quotas, determinism, and skill packaging. Retained scores lack attached firsthand evaluation records.",
  alternates: { canonical: abs("agents", "/methodology") },
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
            "Legacy agent estimates and intended rubric dimensions; documentation review does not validate these scores.",
          ),
        ]}
      />
      <p className="kicker">Attribution · Intended rubric · Evidence limits</p>
      <h1>Agent-side methodology</h1>
      <p>
        Twin Scores are legacy editorial estimates on a 0–100 scale. No firsthand product-test log or per-dimension scoring worksheet is attached to these retained scores. Dated documentation checks establish only the specific product facts they cite; they do not validate the scores. The intended agent rubric weights API quality, MCP or tool surface, CLI, structured docs, machine auth, quotas, determinism, and skill packaging.
      </p>
      <h2>Who, how, and why</h2>
      <p>
        The catalog records the bylines Edu Tor, Maya Chen and Jonas Okonkwo. Their professional history and firsthand product evaluations are not independently verified in this evidence register. The bylines are catalog attributions; this evidence register contains agent documentation review dated 2026-10-16, with a responsible human editor unassigned.
      </p>
      <h3>SKILL.md and the dataset</h3>
      <p>
        Each product has a real SKILL.md derived from catalog facts, with explicit when-to-use and when-not-to-use. Download JSON/CSV under CC BY 4.0 from{" "}
        <Link href="/dataset/twin-scores.json">/dataset/twin-scores.json</Link>. The exports reproduce summaries and gaps from final catalog estimates; they do not contain the original scoring observations. Rubric: <Link href="/scorecard">scorecard</Link>.
      </p>
    </article>
  );
}
