import Link from "next/link";
import type { ReactNode } from "react";

export function HallShell({
  kicker,
  title,
  lede,
  children,
  footer,
}: {
  kicker: string;
  title: string;
  lede: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main id="main" className="hall-overlay ssr-column">
      <div className="hall-panel">
        <Link href="/" className="hall-brand">
          <span className="brand-orb" aria-hidden="true" />
          Build Something People Want
        </Link>
        <p className="kicker">{kicker}</p>
        <h1>{title}</h1>
        <p className="hall-lede">{lede}</p>
        {children}
        {footer}
      </div>
    </main>
  );
}
