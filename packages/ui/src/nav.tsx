import type { ReactNode } from "react";
import Link from "next/link";
import { RelicMark } from "./motion/relic-mark";
import type { Tone } from "./motion/tone";

const PEOPLE_LINKS = [
  ["Products", "/products"],
  ["Blog", "/blog"],
  ["Scorecard", "/scorecard"],
  ["Methodology", "/methodology"],
  ["For agents", "/for-agents"],
  ["About", "/about"],
];

const AGENTS_LINKS = [
  ["Products", "/products"],
  ["Skills", "/products"],
  ["Developer resources", "/for-agents"],
  ["API", "/api"],
  ["Scorecard", "/scorecard"],
  ["Methodology", "/methodology"],
];

export function Nav({
  tone = "people",
  title,
  kicker,
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
  const kick =
    kicker ??
    (tone === "people" ? "Worldwide editorial directory · Twin Scores" : "machine-first twin · same slugs");
  const items =
    links ??
    (tone === "people" ? PEOPLE_LINKS : AGENTS_LINKS).map(([label, href]) => ({ label, href }));

  return (
    <header className="mast wrap">
      <div className="bs-nav">
        <Link href="/" className="bs-nav-brand">
          <RelicMark tone={tone} />
          <span>
            <span className="kicker">{kick}</span>
            <span className="bs-nav-wordmark masthead">{word}</span>
          </span>
        </Link>
        <nav className="primary bs-nav-links" aria-label="Primary">
          {items.map((l) => (
            <Link key={l.href + l.label} href={l.href}>
              {l.label}
            </Link>
          ))}
          {trailing ?? (
            <>
              <Link href="/signup">Sign up</Link>
              <Link href="/login">Log in</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
