export type SiteId = "people" | "agents";

export const PEOPLE_HOST = "buildsomethingpeoplewant.com";
export const AGENTS_HOST = "buildsomethingagentswant.com";

export function siteUrl(site: SiteId): string {
  if (site === "people") {
    return process.env.NEXT_PUBLIC_PEOPLE_SITE_URL || `https://${PEOPLE_HOST}`;
  }
  return process.env.NEXT_PUBLIC_AGENTS_SITE_URL || `https://${AGENTS_HOST}`;
}

export function siblingUrl(site: SiteId): string {
  return siteUrl(site === "people" ? "agents" : "people");
}

export function abs(site: SiteId, path: string): string {
  const base = siteUrl(site).replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export const ORG_NAME = {
  people: "Build Something People Want",
  agents: "Build Something Agents Want",
} as const;

export const ORG_TAGLINE = {
  people:
    "A worldwide editorial directory of software scored for humans — Twin Scores, not fake star ratings.",
  agents:
    "A machine-first catalog of the same software entities, with capability matrices, SKILL.md, and open Twin Score data.",
} as const;
