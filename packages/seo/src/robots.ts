import { siteUrl, type SiteId } from "./sites";

const BOTS = [
  "Googlebot",
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "PerplexityBot",
  "ClaudeBot",
  "Google-Extended",
  "Applebot",
  "Bingbot",
];

export function robotsTxt(site: SiteId): string {
  const sitemap = `${siteUrl(site)}/sitemap.xml`;
  const lines = [
    "User-agent: *",
    "Allow: /",
    "",
    ...BOTS.flatMap((b) => [`User-agent: ${b}`, "Allow: /", ""]),
    `Sitemap: ${sitemap}`,
    "",
  ];
  return lines.join("\n");
}
