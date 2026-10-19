import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { catalog, getAuthor } from "../packages/db/src/catalog";
import { abs, llmsFullTxt, llmsTxt, pageMarkdown } from "../packages/seo/src";
import Blog, { metadata as blogMetadata } from "../apps/people/app/blog/page";
import ArticlePage, { generateMetadata } from "../apps/people/app/blog/[slug]/page";
import Home from "../apps/people/app/page";
import AuthorPage from "../apps/people/app/authors/[slug]/page";
import { GET as peopleRss } from "../apps/people/app/feed.xml/route";
import { GET as peopleAtom } from "../apps/people/app/atom.xml/route";
import { GET as agentsRss } from "../apps/agents/app/feed.xml/route";
import { GET as agentsAtom } from "../apps/agents/app/atom.xml/route";
import manifest from "./fixtures/e01f-repair-manifest.json";

vi.mock("@bs/ui", async () => ({
  ...await import("../packages/ui/src/json-ld"),
  ...await import("../packages/ui/src/twin-score"),
  ...await import("../packages/ui/src/breadcrumbs"),
}));
const appRequire = createRequire(new URL("../apps/people/package.json", import.meta.url));
const { renderToStaticMarkup } = appRequire("react-dom/server");
const forbiddenFetch = vi.fn(() => { throw new Error("E01F forbids network access"); });
beforeAll(() => {
  vi.stubGlobal("React", appRequire("react"));
  vi.stubGlobal("fetch", forbiddenFetch);
});
afterAll(() => {
  expect(forbiddenFetch).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const params = (slug: string) => ({ params: Promise.resolve({ slug }) });
const decode = (text: string) => text.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const plain = (html: string) => decode(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const nodes = (html: string): Record<string, unknown>[] => [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].flatMap((match) => {
  const value = JSON.parse(match[1]);
  return Array.isArray(value) ? value : [value];
});
const titleSlug = "human-vs-agent-software-surfaces-2026";
const oldTitle = "Human vs agent software surfaces in 2026: original Twin Score research";
const newTitle = "Human vs agent software surfaces in 2026: retained Twin Score estimates";
const changedSlugs = [...new Set(manifest.fields.map((field) => field.key))];
const articleLinks = (html: string) => [...html.matchAll(/<a href="(\/blog\/[^"/]+)"[^>]*>(.*?)<\/a>/gs)].map((match) => ({ href: match[1], title: plain(match[2]) }));
const expectedLinks = (articles: typeof catalog.articles) => articles.map((article) => ({ href: `/blog/${article.slug}`, title: article.slug === titleSlug ? newTitle : article.title }));

function replaceAt(text: string, offset: number, before: string, after: string): string {
  const chars = Array.from(text);
  expect(chars.slice(offset, offset + Array.from(before).length).join("")).toBe(before);
  chars.splice(offset, Array.from(before).length, after);
  return chars.join("");
}

function feedRecords(xml: string, format: "rss" | "atom") {
  const tag = format === "rss" ? "item" : "entry";
  return [...xml.matchAll(new RegExp(`<${tag}>(.*?)</${tag}>`, "gs"))].map((match) => {
    const record: Record<string, string> = {};
    for (const child of match[1].matchAll(/<(title|link|guid|pubDate|description|id|updated|summary)(?:\s[^>]*)?>(.*?)<\/\1>/gs)) {
      record[child[1]] = decode(child[2]);
    }
    const href = match[1].match(/<link href="([^"]+)"/);
    if (href) record.link = decode(href[1]);
    const guid = match[1].match(/<guid isPermaLink="([^"]+)"/);
    if (guid) record.isPermaLink = guid[1];
    return record;
  });
}

describe("E01F narrow editorial follow-up consumers", () => {
  it("renders the corrected journal introduction and independent metadata description", () => {
    const html = renderToStaticMarkup(Blog());
    const text = plain(html);
    expect(blogMetadata.title).toBe("Journal");
    expect(blogMetadata.alternates?.canonical).toBe(abs("people", "/blog"));
    expect(blogMetadata.description).toBe("Editorial essays and analysis of retained Twin Score estimates from Build Something People Want. Bylines are catalog attributions; firsthand product testing is not documented.");
    expect(text).toContain("The articles summarize retained editorial estimates and documented product facts. Bylines are catalog attributions, not verified identities or credentials.");
    expect(html).toContain("<h3>Catalog analysis and evidence limits</h3>");
    expect(text).toContain("We do not publish thin listicles with invented user counts.");
    expect(text).not.toContain("original 2026 research");
    expect(html).not.toContain("Original research first");
  });

  it("retains all seven journal entries, descriptions, bylines, dates and actual ItemList destinations", () => {
    const html = renderToStaticMarkup(Blog());
    expect(catalog.articles).toHaveLength(7);
    expect(articleLinks(html)).toEqual(expectedLinks(catalog.articles));
    for (const article of catalog.articles) {
      expect(plain(html)).toContain(article.description);
      expect(plain(html)).toContain(getAuthor(article.author)!.name);
      expect(plain(html)).toContain(article.publishedAt);
    }
    const list = nodes(html).find((node) => node["@type"] === "ItemList")!;
    expect(list.itemListElement).toEqual(expectedLinks(catalog.articles).map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.title, url: abs("people", item.href) })));
  });

  it.each(changedSlugs)("propagates only the approved %s edits through HTML, metadata, schema and article Markdown", async (slug) => {
    const article = catalog.articles.find((row) => row.slug === slug)!;
    const expectedTitle = slug === titleSlug ? newTitle : article.title;
    const html = renderToStaticMarkup(await ArticlePage(params(slug)));
    const metadata = await generateMetadata(params(slug));
    expect(plain(html.match(/<h1>(.*?)<\/h1>/s)![1])).toBe(expectedTitle);
    expect(metadata).toMatchObject({ title: expectedTitle, description: article.description, alternates: { canonical: abs("people", `/blog/${slug}`) }, openGraph: { title: expectedTitle, description: article.description, type: "article" } });
    const schema = nodes(html).find((node) => node["@type"] === "BlogPosting")!;
    expect(schema).toMatchObject({ "@id": `${abs("people", `/blog/${slug}`)}#article`, headline: expectedTitle, description: article.description, datePublished: article.publishedAt, dateModified: article.updatedAt, author: { name: getAuthor(article.author)!.name, url: abs("people", `/authors/${article.author}`) } });
    const crumbs = nodes(html).find((node) => node["@type"] === "BreadcrumbList")!;
    expect((crumbs.itemListElement as { name: string; item: string }[]).at(-1)).toMatchObject({ name: expectedTitle, item: abs("people", `/blog/${slug}`) });
    const md = pageMarkdown("people", `/blog/${slug}`);
    expect(md.status).toBe(200);
    expect(md.body.startsWith(`# ${expectedTitle}\n\n`)).toBe(true);
    for (const patch of manifest.patches.filter((patch) => patch.key === slug)) {
      expect(md.body).toContain(patch.after);
      expect(md.body).not.toContain(patch.before);
      if (patch.id !== "C2") expect(plain(html)).toContain(patch.after.replace(/^### /, ""));
    }
    if (slug === titleSlug) {
      expect(md.body.match(/^# Human vs agent software surfaces in 2026: retained Twin Score estimates$/gm)).toHaveLength(2);
      expect(html).not.toContain(oldTitle);
    }
  });

  it("keeps the C3 disclaimer once in its existing combined conclusion paragraph and preserves the distinct upfront limitation", async () => {
    const article = catalog.articles.find((row) => row.slug === titleSlug)!;
    const sentence = "The bylines are catalog attributions; the CSV records retained estimates, not firsthand test results.";
    expect(article.body.split(sentence)).toHaveLength(2);
    expect(article.body).toContain(`performance.\n${sentence}\n\n\n\n## Catalog notes`);
    const html = renderToStaticMarkup(await ArticlePage(params(titleSlug)));
    const paragraphs = [...html.matchAll(/<p(?:\s[^>]*)?>(.*?)<\/p>/gs)].map((match) => decode(match[1]));
    const conclusion = paragraphs.filter((paragraph) => paragraph.includes(sentence));
    expect(conclusion).toHaveLength(1);
    expect(conclusion[0]).toContain(`performance.\n${sentence}`);
    expect(paragraphs.some((paragraph) => paragraph.includes("No firsthand test log or per-dimension worksheet is attached; the following calculations summarize the retained estimates."))).toBe(true);
    expect(pageMarkdown("people", "/blog/chatgpt-vs-claude-vs-gemini-2026").body).not.toContain("the following calculations summarize the retained estimates");
  });

  it("preserves normative publishing advice rather than treating it as verified catalog practice", async () => {
    const policy = plain(renderToStaticMarkup(await ArticlePage(params("fake-ugc-editorial-policy"))));
    const agentic = plain(renderToStaticMarkup(await ArticlePage(params("is-agentic-publishing-directory"))));
    expect(policy).toContain("Named authors. Dates. First-hand use.");
    expect(agentic).toContain("Original research");
  });

  it("propagates the one title change through actual homepage and author article lists", async () => {
    const home = renderToStaticMarkup(Home());
    const author = renderToStaticMarkup(await AuthorPage(params("edu-tor")));
    expect(articleLinks(home)).toEqual(expectedLinks(catalog.articles.slice(0, 4)));
    expect(articleLinks(author)).toEqual(expectedLinks(catalog.articles.filter((article) => article.author === "edu-tor")));
    for (const html of [home, author]) {
      expect(plain(html)).toContain(newTitle);
      expect(html).not.toContain(oldTitle);
    }
  });

  it.each([
    ["people", "rss", peopleRss], ["agents", "rss", agentsRss],
    ["people", "atom", peopleAtom], ["agents", "atom", agentsAtom],
  ] as const)("preserves %s %s records and opaque IDs while updating exactly the C1 title", async (site, format, get) => {
    const article = catalog.articles.find((row) => row.slug === titleSlug)!;
    const xml = await get().text();
    const records = feedRecords(xml, format);
    expect(records[0].title).toBe(newTitle);
    expect(records[0].link).toBe(abs("people", `/blog/${titleSlug}`));
    if (format === "rss") {
      expect(records[0].isPermaLink).toBe("false");
      expect(records[0].guid).toBe(`https://buildsomething${site}want.com/${site === "people" ? "blog" : "products"}/${titleSlug}`);
    } else expect(records[0].id).toBe(`https://buildsomething${site}want.com/blog/${titleSlug}`);
    const currentTitle = article.title;
    let beforeXml: string;
    try {
      article.title = oldTitle;
      beforeXml = await get().text();
    } finally { article.title = currentTitle; }
    const before = feedRecords(beforeXml, format);
    expect(records).toEqual(before.map((record, index) => index === 0 ? { ...record, title: newTitle } : record));
    expect(xml.replace(`<title>${newTitle}</title>`, `<title>${oldTitle}</title>`)).toBe(beforeXml);
  });

  it.each(["people", "agents"] as const)("propagates the corrected title to %s llms maps without altering other destinations or labels", (site) => {
    const article = catalog.articles.find((row) => row.slug === titleSlug)!;
    const currentTitle = article.title;
    for (const render of [llmsTxt, llmsFullTxt]) {
      const current = render(site);
      expect(current).toContain(`[${newTitle}](${abs("people", `/blog/${titleSlug}`)})`);
      expect(current).not.toContain(oldTitle);
      try {
        article.title = oldTitle;
        expect(current.replaceAll(newTitle, oldTitle)).toBe(render(site));
      } finally { article.title = currentTitle; }
    }
  });

  it("keeps the journal Markdown route successful without constraining its AEO01-owned content", () => {
    expect(pageMarkdown("people", "/blog").status).toBe(200);
  });

  it("proves exact listing-source and raw catalog inverses and forward replay without JSON reserialization", () => {
    const listing = readFileSync(new URL(`../${manifest.listing.path}`, import.meta.url), "utf8");
    expect(hash(listing)).toBe(manifest.listing.after_hash);
    let restored = listing;
    for (const patch of [...manifest.listing.patches].sort((a, b) => b.after_offset - a.after_offset)) {
      expect(listing.split(patch.after).length - 1).toBe(patch.expected_after_occurrences);
      restored = replaceAt(restored, patch.after_offset, patch.after, patch.before);
    }
    expect(hash(restored)).toBe("a738db3937306c2d6e5305e5fe240dec03e808053dcc65f84ffd9ef06fe0688a");
    for (const patch of [...manifest.listing.patches].sort((a, b) => b.before_offset - a.before_offset)) {
      expect(restored.split(patch.before).length - 1).toBe(patch.expected_before_occurrences);
      restored = replaceAt(restored, patch.before_offset, patch.before, patch.after);
    }
    expect(restored).toBe(listing);
    const raw = readFileSync(new URL("../packages/db/seed/catalog.json", import.meta.url), "utf8");
    expect(hash(raw)).toBe(manifest.after_file_sha256);
    let baseline = raw;
    const encoded = (text: string) => JSON.stringify(text).slice(1, -1);
    for (const patch of [...manifest.patches].sort((a, b) => b.after_file_offset - a.after_file_offset)) baseline = replaceAt(baseline, patch.after_file_offset, encoded(patch.after), encoded(patch.before));
    expect(hash(baseline)).toBe("562c8ffc668fbc819764ec182067fbe858bc373054dd874391034b33f4bb2952");
    for (const patch of [...manifest.patches].sort((a, b) => b.before_file_offset - a.before_file_offset)) baseline = replaceAt(baseline, patch.before_file_offset, encoded(patch.before), encoded(patch.after));
    expect(baseline).toBe(raw);
  });
});
