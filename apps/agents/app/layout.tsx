import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Frame } from "../components/chrome";
import { JsonLd } from "@bs/ui";
import { orgJsonLd, websiteJsonLd } from "@bs/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://buildsomethingagentswant.com"),
  title: {
    default: "Build Something Agents Want — machine-first Twin Score catalog",
    template: "%s · Build Something Agents Want",
  },
  description:
    "Machine-first sibling of Build Something People Want. Same slugs, capability matrices, SKILL.md, OpenAPI, CC BY Twin Scores.",
  openGraph: { type: "website", siteName: "Build Something Agents Want", locale: "en_US" },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <JsonLd data={[orgJsonLd("agents"), websiteJsonLd("agents")]} />
        <link rel="alternate" type="application/rss+xml" href="https://buildsomethingagentswant.com/feed.xml" />
      </head>
      <body>
        <Frame>
          <main id="main" className="wrap py-8">{children}</main>
        </Frame>
      </body>
    </html>
  );
}
