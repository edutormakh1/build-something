import type { Article, Author, Product, Review } from "@bs/db";
import { abs, ORG_NAME, siteUrl, type SiteId } from "./sites";

export function orgJsonLd(site: SiteId) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: ORG_NAME[site],
    url: siteUrl(site),
    founder: { "@type": "Person", name: "Edu Tor", url: abs("people", "/authors/edu-tor") },
    sameAs: ["https://github.com/edutormakh1"],
  };
}

export function websiteJsonLd(site: SiteId) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: ORG_NAME[site],
    url: siteUrl(site),
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl(site)}/products?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function softwareJsonLd(site: SiteId, product: Product, reviews: Review[]) {
  const editorial = reviews.filter((r) => r.kind === "editorial" && r.status === "published");
  const url = abs(site, `/products/${product.slug}`);
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: product.name,
    url,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    publisher: { "@type": "Organization", name: product.vendor, url: product.website },
    description: product.description,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: product.pricing },
  };
  if (editorial.length) {
    const score = site === "people" ? product.twin.human : product.twin.agent;
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: (score / 20).toFixed(1),
      bestRating: "5",
      worstRating: "1",
      ratingCount: editorial.length,
      reviewCount: editorial.length,
      description: "Editorial Twin Score converted to a 5-point scale. Not a user-count rating.",
    };
  }
  return data;
}

export function reviewJsonLd(site: SiteId, product: Product, review: Review, author: Author | undefined) {
  const score = site === "people" ? review.scoreHuman ?? product.twin.human : review.scoreAgent ?? product.twin.agent;
  return {
    "@context": "https://schema.org",
    "@type": "Review",
    url: abs(site, `/reviews/${review.slug}`),
    name: review.title,
    reviewBody: review.body.slice(0, 5000),
    datePublished: review.publishedAt,
    reviewRating: {
      "@type": "Rating",
      ratingValue: (score / 20).toFixed(1),
      bestRating: "5",
      worstRating: "1",
    },
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
  };
}

export function personJsonLd(author: Author) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: author.name,
    jobTitle: author.role,
    description: author.bio,
    url: abs("people", `/authors/${author.slug}`),
    sameAs: author.sameAs,
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
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    author: {
      "@type": "Person",
      name: author?.name ?? "Edu Tor",
      url: abs("people", `/authors/${author?.slug ?? "edu-tor"}`),
    },
    publisher: orgJsonLd("people"),
    mainEntityOfPage: abs("people", `/blog/${article.slug}`),
  };
}

export function jsonLdScript(data: unknown | unknown[]): string {
  const payload = Array.isArray(data) ? data : [data];
  return JSON.stringify(payload.length === 1 ? payload[0] : payload);
}
