import type { ReactNode } from "react";
import Link from "next/link";
import type { Tone } from "./motion/tone";

const PEOPLE_LINKS = [
  ["Products", "/products"],
  ["Journal", "/blog"],
  ["Scorecard", "/scorecard"],
  ["Methodology", "/methodology"],
  ["API", "/api"],
  ["For agents", "/for-agents"],
  ["About", "/about"],
];

const AGENTS_LINKS = [
  ["Catalog", "/products"],
  ["API", "/api"],
  ["Developer resources", "/for-agents"],
  ["Scorecard", "/scorecard"],
  ["Methodology", "/methodology"],
];

export function Nav({
  tone = "people",
  title,
  links,
  trailing,
}: {
  tone?: Tone;
  title?: string;
  kicker?: string;
  links?: { href: string; label: string }[];
  trailing?: ReactNode;
}) {
  const word = title ?? (tone === "people" ? "Build Something People Want" : "Build Something Agents Want");
  const items = links ?? (tone === "people" ? PEOPLE_LINKS : AGENTS_LINKS).map(([label, href]) => ({ label, href }));

  return (
    <header className="mast wrap">
      <div className="bs-nav">
        <Link href="/" className="bs-nav-brand">{word}</Link>
        <nav className="primary bs-nav-links" aria-label="Primary">
          {items.slice(0, 2).map((link) => (
            <Link key={link.href + link.label} href={link.href}>{link.label}</Link>
          ))}
          <Link href="/login">Log in</Link>
          <details className="nav-more">
            <summary>More</summary>
            <div className="nav-more-links">
              {items.slice(2).map((link) => (
                <Link key={link.href + link.label} href={link.href}>{link.label}</Link>
              ))}
              <Link href="/signup">Sign up</Link>
              {trailing}
            </div>
          </details>
        </nav>
      </div>
    </header>
  );
}
