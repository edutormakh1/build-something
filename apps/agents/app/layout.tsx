import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BrandFonts, display, sans, JsonLd } from "@bs/ui";
import { Experience } from "../components/experience";
import { abs, orgJsonLd, siblingUrl, siteUrl, websiteJsonLd } from "@bs/seo";
import "./globals.css";
import "./geo-crawler.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl("agents")),
  title: {
    default: "Build Something Agents Want — machine-first Twin Score catalog",
    template: "%s · Build Something Agents Want",
  },
  description:
    "Machine-first sibling of Build Something People Want. Same slugs, capability matrices, SKILL.md, OpenAPI, CC BY Twin Scores.",
  openGraph: {
    type: "website",
    siteName: "Build Something Agents Want",
    locale: "en_US",
    images: ["/art/agents-hero-3d.png"],
  },
  twitter: { card: "summary_large_image", images: ["/art/agents-hero-3d.png"] },
  robots: { index: true, follow: true },
  authors: [{ name: "Edu Tor", url: abs("people", "/authors/edu-tor") }],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <head>
        <BrandFonts />
        <JsonLd data={[orgJsonLd("agents"), websiteJsonLd("agents")]} />
        <link rel="alternate" type="application/rss+xml" href={abs("agents", "/feed.xml")} />
        <link rel="alternate" type="application/atom+xml" title="Atom" href={abs("agents", "/atom.xml")} />
        <link rel="alternate" type="text/plain" title="llms.txt" href={abs("agents", "/llms.txt")} />
        <link rel="service-desc" type="application/vnd.oai.openapi+json" href={abs("agents", "/openapi.json")} />
        <link rel="api-catalog" href={abs("agents", "/.well-known/api-catalog")} />
      </head>
      <body>
        <Experience twinUrl={siblingUrl("agents")}>{children}</Experience>
      </body>
    </html>
  );
}
