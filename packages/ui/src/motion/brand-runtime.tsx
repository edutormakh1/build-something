"use client";

import { PageTransition } from "./page-transition";

/** Client island: 3D route veil. Fonts are injected by SkipLink on the server. */
export function BrandRuntime() {
  return <PageTransition />;
}
