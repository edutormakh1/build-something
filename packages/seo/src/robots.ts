import { siteUrl, type SiteId } from "./sites";

/** Search + AI citation crawlers from seo-geo / seo-technical. Training-only CCBot is not listed. */
export const AI_AND_SEARCH_BOTS = [
  "Googlebot",
  "Google-Extended",
  "Google-CloudVertexBot",
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "anthropic-ai",
  "PerplexityBot",
  "Applebot",
  "Applebot-Extended",
  "Bingbot",
  "cohere-ai",
] as const;

/** Account chrome: noindex in metadata AND omitted from sitemaps. */
export const ROBOTS_DISALLOW = ["/admin", "/account", "/login", "/signup", "/forgot-password"] as const;

export function robotsTxt(site: SiteId): string {
  const sitemap = `${siteUrl(site)}/sitemap.xml`;
  const disallow = ROBOTS_DISALLOW.map((p) => `Disallow: ${p}`);
  const group = (agent: string) => [`User-agent: ${agent}`, "Allow: /", ...disallow, ""];
  const lines = [
    ...group("*"),
    ...AI_AND_SEARCH_BOTS.flatMap((b) => group(b)),
    `Sitemap: ${sitemap}`,
    "",
  ];
  return lines.join("\n");
}
