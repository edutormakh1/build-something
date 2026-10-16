"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BrandRuntime, CanvasErrorBoundary, Footer, Nav, SkipLink } from "@bs/ui";

const WorldCanvas = dynamic(() => import("./world/canvas"), { ssr: false });

const HALL = new Set(["/login", "/signup", "/forgot-password"]);

export function Experience({ children, twinUrl }: { children: ReactNode; twinUrl: string }) {
  const path = usePathname() || "/";
  const hall = HALL.has(path);
  return (
    <>
      <SkipLink />
      <CanvasErrorBoundary>
        <BrandRuntime />
      </CanvasErrorBoundary>
      {hall ? (
        children
      ) : (
        <>
          <Nav
            tone="agents"
            kicker="Night exhibition · Worldwide · English"
            trailing={
              <>
                <Link href="/signup" className="nav-cta">
                  Sign up
                </Link>
                <Link href="/login" className="nav-enter">
                  Enter
                </Link>
              </>
            }
          />
          <main id="main" className="stage ssr-column">
            {children}
          </main>
          <Footer tone="agents" twinUrl={twinUrl} />
        </>
      )}
      <CanvasErrorBoundary>
        <WorldCanvas />
      </CanvasErrorBoundary>
    </>
  );
}
