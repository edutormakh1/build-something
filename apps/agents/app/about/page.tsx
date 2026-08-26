import type { Metadata } from "next";
import { JsonLd } from "@bs/ui";
import { breadcrumbJsonLd, webPageJsonLd } from "@bs/seo";

export const metadata: Metadata = {
  title: "About Build Something Agents Want",
  description:
    "Machine-first sibling of Build Something People Want, edited by Edu Tor. Same worldwide English catalog, same Twin Scores, different chrome: matrices, SKILL.md, and open data.",
  alternates: { canonical: "https://buildsomethingagentswant.com/about" },
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
            "Machine-first sibling of Build Something People Want, edited by Edu Tor. Same slugs, Twin Scores, capability matrices.",
          ),
        ]}
      />
      <p className="kicker">Edited by Edu Tor</p>
      <h1>About Build Something Agents Want</h1>
      <p>
        Build Something Agents Want is the machine-first sibling of Build Something People Want, edited by Edu Tor. Same worldwide English catalog, same Twin Scores, different contract: capability matrices, SKILL.md, OpenAPI, and a CC BY 4.0 dataset instead of magazine decks.
      </p>
      <h2>What we skip</h2>
      <p>
        We skip MCP unless a real Streamable HTTP or documented tool surface exists. We skip fake user counts. We skip city-page programmatic spam. We skip shipping a fake MCP manifest.
      </p>
      <h3>Twin</h3>
      <p>
        Humans read https://buildsomethingpeoplewant.com — same slugs. Author bios live at /authors/edu-tor on that site. Corrections: editor@buildsomethingagentswant.com.
      </p>
    </article>
  );
}
