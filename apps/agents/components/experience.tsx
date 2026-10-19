"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Footer, Nav, SkipLink } from "@bs/ui";

const HALL = new Set(["/login", "/signup", "/forgot-password"]);

export function Experience({ children, twinUrl }: { children: ReactNode; twinUrl: string }) {
  const path = usePathname() || "/";
  const hall = HALL.has(path);
  return (
    <>
      <SkipLink />
      {hall ? (
        children
      ) : (
        <>
          <Nav tone="agents" />
          <main id="main" className="stage ssr-column">
            {children}
          </main>
          <Footer tone="agents" twinUrl={twinUrl} />
        </>
      )}
    </>
  );
}
