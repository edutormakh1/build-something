export type Tone = "people" | "agents";

export function readTone(): Tone {
  if (typeof document === "undefined") return "people";
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--site").trim();
  return raw === "agents" ? "agents" : "people";
}

export const STILLS = {
  people: {
    mark: "/art/brand-mark-3d.png",
    hero: "/art/people-hero-3d.png",
    hall: "/art/login-hall-3d.png",
  },
  agents: {
    mark: "/art/brand-mark-3d.png",
    hero: "/art/agents-hero-3d.png",
    hall: "/art/login-hall-3d.png",
  },
} as const;
