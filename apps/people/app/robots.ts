import type { MetadataRoute } from "next";
import { abs, AI_AND_SEARCH_BOTS, ROBOTS_DISALLOW } from "@bs/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: [...ROBOTS_DISALLOW] },
      ...AI_AND_SEARCH_BOTS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: [...ROBOTS_DISALLOW],
      })),
    ],
    sitemap: abs("people", "/sitemap.xml"),
  };
}
