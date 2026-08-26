export function TwinScore({
  human,
  agent,
  updated,
  emphasize,
}: {
  human: number;
  agent: number;
  updated?: string;
  emphasize?: "human" | "agent";
}) {
  return (
    <div className="twin-score" aria-label={`Twin Score human ${human} agent ${agent}`}>
      <div className={emphasize === "agent" ? "twin-pill muted" : "twin-pill"}>
        <span className="twin-label">Human</span>
        <span className="twin-num">{human}</span>
      </div>
      <div className={emphasize === "human" ? "twin-pill muted" : "twin-pill"}>
        <span className="twin-label">Agent</span>
        <span className="twin-num">{agent}</span>
      </div>
      {updated ? <p className="twin-updated">Updated {updated}. Editorial, not a user-count rating.</p> : null}
    </div>
  );
}
