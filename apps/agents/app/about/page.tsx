import type { Metadata } from "next";
export const metadata: Metadata = {
  title: 'About',
  description: 'Machine-first sibling of Build Something People Want, edited by Edu Tor. Same worldwide English catalog, same Twin Scores, different chrome:',
  alternates: { canonical: "https://buildsomethingagentswant.com/about" },
};
export default function Page() {
  return (
    <article className="prose">
      <h1>About Build Something Agents Want</h1>
      <p>Machine-first sibling of Build Something People Want, edited by Edu Tor. Same worldwide English catalog, same Twin Scores, different chrome: phosphor on charcoal, matrices instead of magazine decks.</p>
      <h2>What we skip</h2>
      <p>We skip MCP unless Streamable HTTP actually exists. We skip fake user counts. We skip city-page programmatic spam.</p>
      <h3>Twin</h3>
      <p>Humans: https://buildsomethingpeoplewant.com — same slugs.</p>
    </article>
  );
}
