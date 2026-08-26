import type { Metadata } from "next";
import { catalog } from "@bs/db";
import { JsonLd } from "@bs/ui";
import { breadcrumbJsonLd, webPageJsonLd } from "@bs/seo";

export const metadata: Metadata = {
  title: "Twin Score rubric",
  description: "Public rubric for human and agent Twin Scores, with weights and a downloadable dataset.",
  alternates: { canonical: "https://buildsomethingpeoplewant.com/scorecard" },
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
        A Twin Score is two editorial numbers from 0 to 100, not a five-star widget with a made-up rater count. {catalog.rubric.notes} JSON-LD AggregateRating, when present, is those staff scores scaled to 5, with reviewCount equal to editorial reviews — never a fake user total.
      </p>
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
        <a href="https://buildsomethingagentswant.com/dataset/twin-scores.json">twin-scores.json</a> and the CSV sibling. License: CC BY 4.0.
      </p>
    </article>
  );
}
