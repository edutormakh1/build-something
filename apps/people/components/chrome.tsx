import Link from "next/link";
import type { ReactNode } from "react";
import { siblingUrl } from "@bs/seo";

const LINKS: [string, string][] = [
  ["Gallery", "/products"],
  ["Journal", "/blog"],
  ["Scorecard", "/scorecard"],
  ["Methodology", "/methodology"],
  ["For agents", "/for-agents"],
  ["About", "/about"],
];

export function Header() {
  return (
    <header className="mast">
      <div className="mast-inner">
        <Link href="/" className="brand">
          <span className="brand-orb" aria-hidden="true" />
          <span className="brand-copy">
            <span className="kicker">Worldwide gallery · Twin Scores</span>
            <span className="masthead">Build Something People Want</span>
          </span>
        </Link>
        <nav className="primary" aria-label="Primary">
          {LINKS.map(([label, href]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
          <Link href="/signup" className="nav-cta">
            Join
          </Link>
          <Link href="/login" className="nav-enter">
            Enter
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site">
      <p>
        Build Something People Want is edited by Edu Tor. Twin site:{" "}
        <a href={siblingUrl("people")}>Build Something Agents Want</a>.
      </p>
      <p>
        <a href="/editorial-policy">Editorial policy</a> · <a href="/methodology">Methodology</a> ·{" "}
        <a href="/contact">Contact</a> · <a href="/feed.xml">RSS</a> · <a href="/llms.txt">llms.txt</a>
      </p>
    </footer>
  );
}

export function Frame({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
