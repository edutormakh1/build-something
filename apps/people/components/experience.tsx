"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BrandRuntime, Footer, Nav, SkipLink } from "@bs/ui";

const WorldCanvas = dynamic(() => import("./world/canvas"), { ssr: false });

const HALL = new Set(["/login", "/signup", "/forgot-password"]);

export function Experience({ children }: { children: ReactNode }) {
  const path = usePathname() || "/";
  const hall = HALL.has(path);
  return (
    <>
      <SkipLink />
      <BrandRuntime />
      {hall ? (
        children
      ) : (
        <>
          <Nav
            tone="people"
            trailing={
              <>
                <Link href="/signup" className="nav-cta">
                  Join
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
          <Footer tone="people" />
        </>
      )}
      <WorldCanvas />
    </>
  );
}
