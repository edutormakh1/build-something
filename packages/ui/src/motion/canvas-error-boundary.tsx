"use client";

import { Component, type ReactNode } from "react";

/** Isolates a WebGL/r3f throw so the SSR document stays mounted. */
export class CanvasErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { crashed: boolean }
> {
  state = { crashed: false };

  static getDerivedStateFromError() {
    return { crashed: true };
  }

  render() {
    if (this.state.crashed) return this.props.fallback ?? null;
    return this.props.children;
  }
}
