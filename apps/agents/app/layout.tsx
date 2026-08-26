import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BrandFonts, display, sans, JsonLd } from "@bs/ui";
import { Experience } from "../components/experience";
import { orgJsonLd, websiteJsonLd } from "@bs/seo";
import "./globals.css";
import "./geo-crawler.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://buildsomethingagentswant.com"),
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
  authors: [{ name: "Edu Tor", url: "https://buildsomethingpeoplewant.com/authors/edu-tor" }],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <head>
        <BrandFonts />
        <JsonLd data={[orgJsonLd("agents"), websiteJsonLd("agents")]} />
        <link rel="alternate" type="application/rss+xml" href="https://buildsomethingagentswant.com/feed.xml" />
        <link rel="alternate" type="application/atom+xml" title="Atom" href="https://buildsomethingagentswant.com/atom.xml" />
        <link rel="alternate" type="text/plain" title="llms.txt" href="https://buildsomethingagentswant.com/llms.txt" />
      </head>
      <body>
        <Experience>{children}</Experience>
      </body>
    </html>
  );
}
