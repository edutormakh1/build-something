import type { Article, Author, Product, Review } from "@bs/db";
import { nativeScore } from "./native-score";
import { abs, ORG_NAME, ORG_TAGLINE, siteUrl, type SiteId } from "./sites";

function orgId(site: SiteId): string {
  return `${siteUrl(site)}/#organization`;
}

function websiteId(site: SiteId): string {
  return `${siteUrl(site)}/#website`;
}

export function orgJsonLd(site: SiteId) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": orgId(site),
    name: ORG_NAME[site],
    url: siteUrl(site),
    description: ORG_TAGLINE[site],
    email: site === "people" ? "editor@buildsomethingpeoplewant.com" : "editor@buildsomethingagentswant.com",
    sameAs: ["https://github.com/edutormakh1"],
  };
}

export function websiteJsonLd(site: SiteId) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": websiteId(site),
    name: ORG_NAME[site],
    url: siteUrl(site),
    inLanguage: "en-US",
    description: ORG_TAGLINE[site],
    publisher: { "@id": orgId(site) },
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl(site)}/products?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function webPageJsonLd(site: SiteId, path: string, name: string, description: string) {
  const url = abs(site, path);
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name,
    description,
    inLanguage: "en-US",
    isPartOf: { "@id": websiteId(site) },
    about: { "@id": orgId(site) },
  };
}

export function datasetJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": `${abs("agents", "/for-agents")}#dataset`,
    name: "Twin Scores catalog",
    description:
      "Legacy editorial human and agent estimates (0–100) and catalog capability grades; documentation checks do not validate these scores. License CC BY 4.0.",
    url: abs("agents", "/for-agents"),
    license: "https://creativecommons.org/licenses/by/4.0/",
    creator: { "@id": orgId("agents") },
    isAccessibleForFree: true,
    inLanguage: "en-US",
    distribution: [
      {
        "@type": "DataDownload",
        encodingFormat: "application/json",
        contentUrl: abs("agents", "/dataset/twin-scores.json"),
      },
      {
        "@type": "DataDownload",
        encodingFormat: "text/csv",
        contentUrl: abs("agents", "/dataset/twin-scores.csv"),
      },
    ],
  };
}

export function softwareJsonLd(site: SiteId, product: Product, reviews: Review[]) {
  // Preserve the existing three-argument interface; review rows do not establish
  // an aggregate rating for the product's editorial Twin Scores.
  void reviews;
  const url = abs(site, `/products/${product.slug}`);
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${url}#software`,
    name: product.name,
    url,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: "en-US",
    publisher: { "@type": "Organization", name: product.vendor, url: product.website },
    description: product.description,
    offers: {
      "@type": "Offer",
      url: product.website,
      description: product.pricing,
      availability: "https://schema.org/OnlineOnly",
    },
  };
  return data;
}

export function reviewJsonLd(site: SiteId, product: Product, review: Review, author: Author | undefined) {
  const score = nativeScore(site === "people" ? review.scoreHuman : review.scoreAgent);
  const hasScore = score !== undefined;
  return {
    "@context": "https://schema.org",
    "@type": "Review",
    url: abs(site, `/reviews/${review.slug}`),
    name: review.title,
    reviewBody: review.body.slice(0, 5000),
    datePublished: review.publishedAt,
    inLanguage: "en-US",
    ...(hasScore ? {
      reviewRating: {
        "@type": "Rating",
        ratingValue: score,
        bestRating: 100,
        worstRating: 0,
      },
    } : {}),
    author: {
      "@type": "Person",
      name: author?.name ?? "Build Something staff",
      url: author ? abs("people", `/authors/${author.slug}`) : abs(site, "/about"),
    },
    itemReviewed: {
      "@type": "SoftwareApplication",
      name: product.name,
      url: abs(site, `/products/${product.slug}`),
    },
    publisher: { "@id": orgId(site) },
  };
}

export function personJsonLd(author: Author) {
  const localOrigins: [string, SiteId][] = [
    ["https://buildsomethingpeoplewant.com", "people"],
    ["https://www.buildsomethingpeoplewant.com", "people"],
    ["https://buildsomethingagentswant.com", "agents"],
    ["https://www.buildsomethingagentswant.com", "agents"],
  ];
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${abs("people", `/authors/${author.slug}`)}#person`,
    name: author.name,
    jobTitle: author.role,
    description: author.bio,
    url: abs("people", `/authors/${author.slug}`),
    sameAs: author.sameAs.map((url) => {
      const local = localOrigins.find(([origin]) => url === origin || url.startsWith(`${origin}/`));
      return local ? `${siteUrl(local[1])}${url.slice(local[0].length)}` : url;
    }),
    worksFor: { "@id": orgId("people") },
  };
}

export function breadcrumbJsonLd(site: SiteId, items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: abs(site, item.path),
    })),
  };
}

export function itemListJsonLd(site: SiteId, name: string, paths: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListElement: paths.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: p.name,
      url: abs(site, p.path),
    })),
  };
}

export function articleJsonLd(article: Article, author: Author | undefined) {
  const url = abs("people", `/blog/${article.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    inLanguage: "en-US",
    author: {
      "@type": "Person",
      name: author?.name ?? "Edu Tor",
      url: abs("people", `/authors/${author?.slug ?? "edu-tor"}`),
    },
    publisher: { "@id": orgId("people") },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${url}#webpage` },
    isPartOf: { "@id": websiteId("people") },
  };
}

export function jsonLdScript(data: unknown | unknown[]): string {
  const payload = Array.isArray(data) ? data : [data];
  return JSON.stringify(payload.length === 1 ? payload[0] : payload);
}
