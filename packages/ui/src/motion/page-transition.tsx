"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { readTone } from "./tone";
import { useReducedMotion } from "./hooks";

const TransitVeil = dynamic(() => import("./transit-veil"), { ssr: false });

export function PageTransition() {
  const pathname = usePathname();
  const first = useRef(true);
  const [show, setShow] = useState(false);
  const [tone, setTone] = useState<"people" | "agents">("people");
  const reduced = useReducedMotion();

  useEffect(() => {
    setTone(readTone());
  }, []);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduced) return;
    setShow(true);
    const t = window.setTimeout(() => setShow(false), 720);
    return () => window.clearTimeout(t);
  }, [pathname, reduced]);

  if (!show || reduced) return null;
  return <TransitVeil tone={tone} />;
}
