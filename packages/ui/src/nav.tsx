"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { BrandMarkArt } from "./art";
import { CanvasErrorBoundary } from "./motion/canvas-error-boundary";
import type { Tone } from "./motion/tone";

const RelicMark = dynamic(() => import("./motion/relic-mark").then((m) => m.RelicMark), {
  ssr: false,
  loading: () => <BrandMarkArt />,
});

const PEOPLE_LINKS = [
  ["Products", "/products"],
  ["Blog", "/blog"],
  ["Scorecard", "/scorecard"],
  ["Methodology", "/methodology"],
  ["API", "/api"],
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
          <CanvasErrorBoundary fallback={<BrandMarkArt />}>
            <RelicMark tone={tone} />
          </CanvasErrorBoundary>
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
