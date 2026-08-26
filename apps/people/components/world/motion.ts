"use client";

import { useEffect, useState } from "react";

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return reduced;
}

export function usePageVisible(node: { current: HTMLElement | null }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const update = (onScreen: boolean) => {
      setVisible(onScreen && document.visibilityState === "visible");
    };
    const onVis = () => {
      const el = node.current;
      if (!el) {
        update(document.visibilityState === "visible");
        return;
      }
      const r = el.getBoundingClientRect();
      const onScreen = r.width > 0 && r.height > 0;
      update(onScreen);
    };
    document.addEventListener("visibilitychange", onVis);
    const el = node.current;
    const io = new IntersectionObserver(([entry]) => update(entry.isIntersecting), { threshold: 0.01 });
    if (el) io.observe(el);
    onVis();
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      io.disconnect();
    };
  }, [node]);
  return visible;
}
