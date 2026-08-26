import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Frame } from "../components/chrome";
import { JsonLd } from "@bs/ui";
import { orgJsonLd, websiteJsonLd } from "@bs/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://buildsomethingpeoplewant.com"),
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
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <JsonLd data={[orgJsonLd("people"), websiteJsonLd("people")]} />
        <link rel="alternate" type="application/rss+xml" title="RSS" href="https://buildsomethingpeoplewant.com/feed.xml" />
        <link rel="alternate" type="application/atom+xml" title="Atom" href="https://buildsomethingpeoplewant.com/atom.xml" />
      </head>
      <body>
        <Frame>
          <main id="main" className="wrap py-8">
            {children}
          </main>
        </Frame>
      </body>
    </html>
  );
}
