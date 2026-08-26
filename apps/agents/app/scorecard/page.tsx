import type { Metadata } from "next";
import Link from "next/link";
import { catalog } from "@bs/db";
import { JsonLd } from "@bs/ui";
import { breadcrumbJsonLd, datasetJsonLd, webPageJsonLd } from "@bs/seo";

export const metadata: Metadata = {
  title: "Twin Score rubric (agent view)",
  description:
    "Two numbers, public weights, no star widget with a fake rater count. JSON-LD AggregateRating is staff editorial only.",
  alternates: { canonical: "https://buildsomethingagentswant.com/scorecard" },
};

export default function Page() {
  return (
    <article className="prose">
      <JsonLd
        data={[
          breadcrumbJsonLd("agents", [
            { name: "Home", path: "/" },
            { name: "Twin Score rubric", path: "/scorecard" },
          ]),
          webPageJsonLd(
            "agents",
            "/scorecard",
            "Twin Score rubric (agent view)",
            "Public weights for human and agent Twin Scores. Editorial composites, not fake UGC.",
          ),
          datasetJsonLd(),
        ]}
      />
      <h1>Twin Score rubric (agent view)</h1>
      <p>
        A Twin Score is two editorial numbers from 0 to 100, not a five-star widget with a made-up rater count. JSON-LD AggregateRating is staff editorial only. {catalog.rubric.notes}
      </p>
      <h2>Agent dimensions</h2>
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
      <h3>Human dimensions (twin site)</h3>
      <ul>
        {catalog.rubric.human.map((d) => (
          <li key={d.id}>
            {d.label} ({d.weight}%)
          </li>
        ))}
      </ul>
      <p>
        Download <Link href="/dataset/twin-scores.json">twin-scores.json</Link> and{" "}
        <Link href="/dataset/twin-scores.csv">twin-scores.csv</Link> (CC BY 4.0).
      </p>
    </article>
  );
}
