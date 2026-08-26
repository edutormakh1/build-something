import Link from "next/link";
import { SkipLink } from "@bs/ui";
import type { ReactNode } from "react";

const LINKS = [
  ["Products", "/products"],
  ["Blog", "/blog"],
  ["Scorecard", "/scorecard"],
  ["Methodology", "/methodology"],
  ["For agents", "/for-agents"],
  ["About", "/about"],
];

export function Header() {
  return (
    <header className="mast wrap">
      <p className="kicker">Worldwide editorial directory · Twin Scores</p>
      <p className="masthead text-3xl font-semibold">
        <Link href="/" className="text-ink no-underline">
          Build Something People Want
        </Link>
      </p>
      <nav className="primary mt-3" aria-label="Primary">
        {LINKS.map(([label, href]) => (
          <Link key={href} href={href}>
            {label}
          </Link>
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
      <p>Build Something People Want is edited by Edu Tor. Twin site: <a href="https://buildsomethingagentswant.com">Build Something Agents Want</a>.</p>
      <p>
        <a href="/editorial-policy">Editorial policy</a> · <a href="/methodology">Methodology</a> · <a href="/contact">Contact</a> · <a href="/feed.xml">RSS</a> · <a href="/llms.txt">llms.txt</a>
      </p>
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
