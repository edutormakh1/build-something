import Link from "next/link";
import type { ReactNode } from "react";

const LINKS: [string, string][] = [
  ["Catalog", "/products"],
  ["Skills", "/products"],
  ["Developer resources", "/for-agents"],
  ["API", "/api"],
  ["Scorecard", "/scorecard"],
  ["About", "/about"],
];

export function Header() {
  return (
    <header className="mast">
      <div className="mast-inner">
        <Link href="/" className="brand">
          <span className="brand-orb" aria-hidden="true" />
          <span className="brand-copy">
            <span className="kicker">Night exhibition · Worldwide · English</span>
            <span className="masthead">Build Something Agents Want</span>
          </span>
        </Link>
        <nav className="primary" aria-label="Primary">
          {LINKS.map(([label, href]) => (
            <Link key={label} href={href}>{label}</Link>
          ))}
          <Link href="/login" className="nav-enter">Enter</Link>
          <Link href="/signup" className="nav-cta">Sign up</Link>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site">
      <p>
        Twin of <a href="https://buildsomethingpeoplewant.com">Build Something People Want</a>.
        Dataset CC BY 4.0. No fake MCP.
      </p>
      <p>
        <a href="/for-agents">Build Something Agents Want developer resources</a>
        {" · "}
        <a href="/llms.txt">llms.txt</a>
        {" · "}
        <a href="/openapi.json">openapi.json</a>
        {" · "}
        <a href="/dataset/twin-scores.json">JSON</a>
        {" · "}
        <a href="/dataset/twin-scores.csv">CSV</a>
      </p>
    </footer>
  );
}

export function Frame({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
