import Link from "next/link";
import { SkipLink } from "@bs/ui";
import type { ReactNode } from "react";

const LINKS = [
  ["Products", "/products"],
  ["Skills", "/products"],
  ["Developer resources", "/for-agents"],
  ["API", "/api"],
  ["Scorecard", "/scorecard"],
  ["Methodology", "/methodology"],
];

export function Header() {
  return (
    <header className="mast wrap">
      <p className="kicker">machine-first twin · same slugs</p>
      <p className="masthead text-2xl">
        <Link href="/" className="no-underline">Build Something Agents Want</Link>
      </p>
      <nav className="primary mt-3" aria-label="Primary">
        {LINKS.map(([label, href]) => (
          <Link key={label} href={href}>{label}</Link>
        ))}
        <Link href="/signup">Sign up</Link>
        <Link href="/login">Log in</Link>
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site wrap">
      <p>Twin of <a href="https://buildsomethingpeoplewant.com">Build Something People Want</a>. Dataset CC BY 4.0. No fake MCP.</p>
      <p><a href="/for-agents">Build Something Agents Want developer resources</a> · <a href="/llms.txt">llms.txt</a> · <a href="/openapi.json">openapi.json</a></p>
    </footer>
  );
}

export function Frame({ children }: { children: ReactNode }) {
  return (
    <>
      <SkipLink />
      <Header />
      {children}
      <Footer />
    </>
  );
}
