import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BrandFonts, display, sans, JsonLd } from "@bs/ui";
import { Experience } from "../components/experience";
import { abs, orgJsonLd, siblingUrl, siteUrl, websiteJsonLd } from "@bs/seo";
import "./globals.css";
import "./geo-crawler.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl("people")),
  title: {
    default: "Build Something People Want — Twin Score software directory",
    template: "%s · Build Something People Want",
  },
  description:
    "Worldwide editorial directory of software products scored for humans and agents. Twin Scores, named authors, no fake user reviews.",
  openGraph: {
    type: "website",
    siteName: "Build Something People Want",
    locale: "en_US",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
  authors: [{ name: "Edu Tor", url: abs("people", "/authors/edu-tor") }],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <head>
        <BrandFonts />
        <JsonLd data={[orgJsonLd("people"), websiteJsonLd("people")]} />
        <link rel="alternate" type="application/rss+xml" title="RSS" href={abs("people", "/feed.xml")} />
        <link rel="alternate" type="application/atom+xml" title="Atom" href={abs("people", "/atom.xml")} />
        <link rel="alternate" type="text/plain" title="llms.txt" href={abs("people", "/llms.txt")} />
        <link rel="service-desc" type="application/vnd.oai.openapi+json" href={abs("people", "/openapi.json")} />
        <link rel="api-catalog" href={abs("people", "/.well-known/api-catalog")} />
      </head>
      <body>
        <Experience twinUrl={siblingUrl("people")}>{children}</Experience>
      </body>
    </html>
  );
}
