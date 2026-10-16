import type { Metadata } from "next";
import { catalog } from "@bs/db";
import { JsonLd } from "@bs/ui";
import { abs, breadcrumbJsonLd, webPageJsonLd } from "@bs/seo";

export const metadata: Metadata = {
  title: "Twin Score rubric",
  description: "Public rubric for human and agent Twin Scores, with weights and a downloadable dataset.",
  alternates: { canonical: abs("people", "/scorecard") },
  openGraph: { title: "Twin Score rubric", description: "Public rubric for human and agent Twin Scores, with weights and a downloadable dataset." },
  twitter: { card: "summary_large_image", title: "Twin Score rubric", description: "Public rubric for human and agent Twin Scores, with weights and a downloadable dataset." },
};

export default function Page() {
  return (
    <article className="prose">
      <JsonLd
        data={[
          breadcrumbJsonLd("people", [
            { name: "Home", path: "/" },
            { name: "Twin Score rubric", path: "/scorecard" },
          ]),
          webPageJsonLd(
            "people",
            "/scorecard",
            "Twin Score rubric",
            "Public rubric for human and agent Twin Scores, with weights and a downloadable dataset.",
          ),
        ]}
      />
      <h1>Twin Score rubric</h1>
      <p>
        A Twin Score is two editorial numbers from 0 to 100, not a five-star widget with a made-up rater count. {catalog.rubric.notes} A scored review uses its own audience score on the native 0–100 scale; unscored reviews have no reviewRating.
      </p>
      <p>The rubric describes intended dimensions. The exports reproduce summaries and gaps from final estimates; they do not contain the original scoring observations. The bylines are catalog attributions; this evidence register contains agent documentation review dated 2026-10-16, with a responsible human editor unassigned. Professional history and firsthand product evaluations are not independently verified in this evidence register.</p>
      <h2>Human dimensions</h2>
      <table>
        <thead>
          <tr>
            <th>Dimension</th>
            <th>Weight</th>
          </tr>
        </thead>
        <tbody>
          {catalog.rubric.human.map((d) => (
            <tr key={d.id}>
              <td>{d.label}</td>
              <td>{d.weight}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Agent dimensions</h3>
      <table>
        <thead>
          <tr>
            <th>Dimension</th>
            <th>Weight</th>
          </tr>
        </thead>
        <tbody>
          {catalog.rubric.agent.map((d) => (
            <tr key={d.id}>
              <td>{d.label}</td>
              <td>{d.weight}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        CSV and JSON live on the agents twin:{" "}
        <a href={abs("agents", "/dataset/twin-scores.json")}>twin-scores.json</a> and the CSV sibling. License: CC BY 4.0.
      </p>
    </article>
  );
}
