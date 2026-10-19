export type Tone = "people" | "agents";

export function readTone(): Tone {
  if (typeof document === "undefined") return "people";
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--site").trim();
  return raw === "agents" ? "agents" : "people";
}

export const STILLS = {
  people: {
    mark: "/art/brand-mark-display-v1.webp",
    environmentMark: "/art/brand-mark-environment-v1.webp",
    hero: "/art/people-hero-display-v1.webp",
    hall: "/art/login-hall-3d.png",
  },
  agents: {
    mark: "/art/brand-mark-display-v1.webp",
    environmentMark: "/art/brand-mark-environment-v1.webp",
    hero: "/art/agents-hero-display-v1.webp",
    hall: "/art/login-hall-3d.png",
  },
} as const;
