import type { Metadata } from "next";
export const metadata: Metadata = {
  title: 'Twin Score rubric',
  description: 'Two numbers, public weights, no star widget with a fake rater count. JSON-LD AggregateRating is staff editorial only.',
  alternates: { canonical: "https://buildsomethingagentswant.com/scorecard" },
};
export default function Page() {
  return (
    <article className="prose">
      <h1>Twin Score rubric (agent view)</h1>
      <p>Two numbers, public weights, no star widget with a fake rater count. JSON-LD AggregateRating is staff editorial only.</p>
      <h2>Download</h2>
      <p>Use /dataset/twin-scores.json and /dataset/twin-scores.csv.</p>
      <h3>People twin</h3>
      <p>The human-weighted ranking lives on the magazine.</p>
    </article>
  );
}
