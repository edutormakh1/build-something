import type { Metadata } from "next";
import { JsonLd } from "@bs/ui";
import { abs, breadcrumbJsonLd, webPageJsonLd } from "@bs/seo";

export const metadata: Metadata = {
  title: "About Build Something Agents Want",
  description:
    "Machine-first sibling of Build Something People Want. Legacy editorial estimates, catalog byline attributions, capability matrices, SKILL.md, and open data.",
  alternates: { canonical: abs("agents", "/about") },
};

export default function Page() {
  return (
    <article className="prose">
      <JsonLd
        data={[
          breadcrumbJsonLd("agents", [
            { name: "Home", path: "/" },
            { name: "About", path: "/about" },
          ]),
          webPageJsonLd(
            "agents",
            "/about",
            "About Build Something Agents Want",
            "Machine-first sibling of Build Something People Want. Same slugs, retained editorial estimates and catalog capability grades.",
          ),
        ]}
      />
      <p className="kicker">Catalog byline attributions</p>
      <h1>About Build Something Agents Want</h1>
      <p>
        Build Something Agents Want is the machine-first sibling of Build Something People Want. Same worldwide English catalog, same Twin Scores, different contract: capability matrices, SKILL.md, OpenAPI, and a CC BY 4.0 dataset instead of magazine decks.
      </p>
      <p>Twin Scores are legacy editorial estimates on a 0–100 scale. No firsthand product-test log or per-dimension scoring worksheet is attached to these retained scores. Dated documentation checks establish only the specific product facts they cite; they do not validate the scores.</p>
      <p>The catalog records the bylines Edu Tor, Maya Chen and Jonas Okonkwo. Their professional history and firsthand product evaluations are not independently verified in this evidence register. The bylines are catalog attributions; this evidence register contains agent documentation review dated 2026-10-16, with a responsible human editor unassigned.</p>
      <h2>What we skip</h2>
      <p>
        We skip MCP unless a real Streamable HTTP or documented tool surface exists. We skip fake user counts. We skip city-page programmatic spam. We skip shipping a fake MCP manifest.
      </p>
      <h3>Twin</h3>
      <p>
        Humans read {abs("people", "/")} — same slugs. Author bios live at /authors/edu-tor on that site. Corrections: editor@buildsomethingagentswant.com.
      </p>
    </article>
  );
}
