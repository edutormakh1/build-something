// Fresh local Workers must already be running. No production URL is fetched.
// node scripts/check-canonicals.mjs --people http://localhost:4310 --agents
// http://localhost:4311 --baseline-catalog /tmp/pre-s03.json --output-dir /tmp/crawl
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

const { values } = parseArgs({ options: {
  people: { type: "string" }, agents: { type: "string" },
  "baseline-catalog": { type: "string" }, "output-dir": { type: "string" },
  "retry-from": { type: "string" },
} });
const sites = ["people", "agents"];
const canonical = Object.fromEntries(sites.map((site) => [site, `https://www.buildsomething${site}want.com`]));
const bases = Object.fromEntries(sites.map((site) => {
  const url = new URL(values[site]);
  assert.ok(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname), `${site}: loopback HTTP required`);
  assert.ok(!url.username && !url.password && !url.search && !url.hash && url.pathname === "/", `${site}: supply only an origin`);
  return [site, url.origin];
}));
assert.notEqual(bases.people, bases.agents, "two distinct local app origins required");
assert.ok(values["baseline-catalog"] && values["output-dir"], "baseline-catalog and output-dir required to preserve historical evidence");
const catalog = JSON.parse(await readFile(new URL("../packages/db/seed/catalog.json", import.meta.url), "utf8"));
const baseline = JSON.parse(await readFile(values["baseline-catalog"], "utf8"));
const output = values["output-dir"];
await mkdir(output, { recursive: true });
const expectedPairs = baseline.comparePairs.map(({ a, b }) => `/compare/${a}-vs-${b}`);
assert.equal(expectedPairs.length, 25, "historical curated inventory");
assert.deepEqual(catalog.comparePairs.map(({ a, b }) => `/compare/${a}-vs-${b}`), expectedPairs, "stored curated paths/orientation preserved");
const published = catalog.products.filter((p) => p.status === "published");
const products = new Map(published.map((p) => [p.slug, p]));
const records = [], failures = [], inventory = {};
const retryLabels = values["retry-from"] ? new Set(JSON.parse(await readFile(values["retry-from"], "utf8")).failures.map(({ label }) => label)) : undefined;
const browser = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36";
const crawler = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
let lastResponse;
const decode = (text) => text.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#(?:39|x27);/gi, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const tags = (html, tag) => [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>`, "gi"))].map(([value]) => Object.fromEntries([...value.matchAll(/([\w:-]+)=["']([^"']*)["']/g)].map(([, key, val]) => [key.toLowerCase(), decode(val)])));
const xmlValues = (xml, tag) => [...xml.matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "g"))].map((match) => decode(match[1]));
const visible = (html) => decode(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ");
const publicUrl = (site, route) => `${canonical[site]}${route}`;

function localTarget(value) {
  const url = new URL(value);
  const site = sites.find((site) => [canonical[site], canonical[site].replace("www.", "")].includes(url.origin));
  assert.ok(site, `refuse external target: ${value}`);
  assert.equal(url.origin, canonical[site], `generated URL must use www: ${value}`);
  return { site, route: `${url.pathname}${url.search}`, canonical: url.href };
}

async function request(site, route, { method = "GET", accept = "text/html", ua = browser, headers = {} } = {}) {
  const url = new URL(route, bases[site]);
  assert.equal(url.origin, bases[site], "request must stay on the selected loopback origin");
  const response = await fetch(url, { method, headers: { accept, "user-agent": ua, ...headers }, redirect: "manual", signal: AbortSignal.timeout(20_000) });
  const body = await response.text();
  const record = { site, route, method, accept, requestHeaders: headers, ua: ua === crawler ? "Googlebot" : "browser", status: response.status, headers: Object.fromEntries(response.headers), bytes: Buffer.byteLength(body) };
  lastResponse = { ...record, body };
  records.push(record);
  console.log(JSON.stringify(record));
  return lastResponse;
}

async function check(label, run) {
  // A corrected checker can recheck only its recorded failures. Sitemap reads
  // still reconstruct the same complete inventory without recrawling successes.
  if (retryLabels && !retryLabels.has(label) && !label.includes("sitemap")) return;
  lastResponse = undefined;
  try { await run(); }
  catch (error) {
    const failure = { label, error: error.message, response: lastResponse };
    failures.push(failure);
    const prefix = `${output}/failure-${String(failures.length).padStart(3, "0")}`;
    await writeFile(`${prefix}.json`, JSON.stringify(failure, null, 2));
    if (lastResponse) await writeFile(`${prefix}.body`, lastResponse.body);
    console.error(JSON.stringify({ FAIL: label, error: error.message, artifact: prefix }));
  }
}

function status(response, expected) { assert.equal(response.status, expected, `${response.site} ${response.method} ${response.route}: HTTP status`); }
function type(response, expected) { assert.ok(response.headers["content-type"]?.includes(expected), `content-type should contain ${expected}`); }
function vary(response) { assert.match(response.headers.vary ?? "", /(?:^|,\s*)accept(?:,|$)/i); }
function schemas(html) {
  return [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].flatMap((match) => {
    const data = JSON.parse(match[1]);
    return Array.isArray(data) ? data : [data];
  });
}
function inspectInternalUrls(value) {
  if (typeof value === "string" && /^https?:\/\//.test(value)) {
    const url = new URL(value);
    if (sites.some((site) => [canonical[site], canonical[site].replace("www.", "")].includes(url.origin))) localTarget(value);
  } else if (value && typeof value === "object") Object.values(value).forEach(inspectInternalUrls);
}
function comparisonFacts(body, route, markdown = false) {
  const [a, b] = route.slice("/compare/".length).split("-vs-");
  const title = `${products.get(a).name} vs ${products.get(b).name}`;
  if (markdown) assert.ok(body.startsWith(`# ${title}\n`), "Markdown canonical operand order");
  else assert.equal(visible(body.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "").trim(), title, "HTML canonical operand order");
  const pair = catalog.comparePairs.find((pair) => pair.a === a && pair.b === b);
  if (pair) assert.ok((markdown ? body : visible(body)).includes(pair.intro.replace(/\s+/g, " ")), "stored curated intro preserved");
}
function htmlPage(response, site, route, { indexable = true } = {}) {
  status(response, 200); type(response, "text/html");
  assert.match(response.body, /<h1\b/i, "server HTML h1");
  const links = tags(response.body, "link");
  assert.deepEqual(links.filter((tag) => tag.rel === "canonical").map((tag) => new URL(tag.href).href), [publicUrl(site, route)], "one matching self-canonical");
  const robots = tags(response.body, "meta").filter((tag) => tag.name === "robots").map((tag) => tag.content).join(", ");
  if (indexable) assert.doesNotMatch(robots, /noindex/i, "indexed page must not be noindex");
  else { assert.match(robots, /noindex/i); assert.match(robots, /(?:^|,\s*)follow(?:,|$)/i); }
  assert.ok(tags(response.body, "a").some((tag) => tag.href === canonical[site === "people" ? "agents" : "people"]), "visible shared Footer twin link");
  for (const resource of ["/feed.xml", "/atom.xml", "/llms.txt", "/openapi.json", "/.well-known/api-catalog"]) assert.ok(links.some((tag) => tag.href === publicUrl(site, resource)), `head discovery ${resource}`);
  const data = schemas(response.body);
  assert.ok(data.some((node) => node["@type"] === "Organization"), "layout Organization schema");
  inspectInternalUrls(data);
  assert.ok(!JSON.stringify(data).includes('"AggregateRating"'), "no composite AggregateRating");
  if (route.startsWith("/compare/")) comparisonFacts(response.body, route);
  if (/^\/products\/[^/]+$/.test(route)) {
    assert.ok(data.some((node) => node["@type"] === "SoftwareApplication"));
    assert.ok(!data.some((node) => node["@type"] === "Review"), "no full invisible Review on product page");
  }
  if (route.startsWith("/reviews/")) {
    const review = catalog.reviews.find((row) => route === `/reviews/${row.slug}`);
    const node = data.find((row) => row["@type"] === "Review");
    assert.ok(node, "dedicated Review schema");
    const score = review.scoreHuman;
    if (typeof score === "number" && Number.isFinite(score) && score >= 0 && score <= 100) {
      assert.deepEqual(node.reviewRating, { "@type": "Rating", ratingValue: score, bestRating: 100, worstRating: 0 });
      assert.ok(visible(response.body).includes(`Human review score: ${score}/100.`), "same native visible score");
    } else { assert.ok(!node.reviewRating); assert.ok(visible(response.body).includes("Unscored review:")); }
  }
  if (route.startsWith("/authors/")) {
    const author = catalog.authors.find((row) => route === `/authors/${row.slug}`);
    const node = data.find((row) => row["@type"] === "Person");
    assert.ok(node);
    const expected = author.sameAs.map((value) => value.replace(/^https:\/\/(?:www\.)?(buildsomething(?:people|agents)want\.com)(?=\/|$)/, "https://www.$1"));
    assert.deepEqual(node.sameAs, expected);
  }
}

async function sitemap(site) {
  const children = [], paths = new Set();
  await check(`${site} sitemap index`, async () => {
    const response = await request(site, "/sitemap.xml"); status(response, 200); type(response, "xml");
    assert.match(response.body, /<sitemapindex\b/);
    children.push(...xmlValues(response.body, "loc")); assert.ok(children.length > 0);
  });
  for (const child of children) await check(`${site} sitemap child ${child}`, async () => {
    const target = localTarget(child); assert.equal(target.site, site);
    const response = await request(site, target.route); status(response, 200); type(response, "xml");
    assert.match(response.body, /<urlset\b/);
    for (const value of xmlValues(response.body, "loc")) {
      const entry = localTarget(value); assert.equal(entry.site, site); paths.add(entry.route);
    }
  });
  inventory[site] = [...paths];
  await check(`${site} curated sitemap inventory`, async () => {
    assert.deepEqual([...paths].filter((route) => route.startsWith("/compare/")).sort(), site === "people" ? [...expectedPairs].sort() : []);
    assert.ok(paths.size > 100, "crawl must include the full emitted inventory");
  });
  for (const route of paths) {
    await check(`${site} HTML ${route}`, async () => htmlPage(await request(site, route), site, route));
    for (const direct of [false, true]) await check(`${site} ${direct ? "direct" : "negotiated"} Markdown ${route}`, async () => {
      const response = await request(site, direct ? `/md${route === "/" ? "" : route}` : route, { accept: "text/markdown" });
      status(response, 200); type(response, "text/markdown"); vary(response);
      assert.ok(/^# /m.test(response.body), "Markdown H1, optionally after SKILL frontmatter");
      if (route.startsWith("/compare/")) {
        assert.equal(response.headers.link, `<${publicUrl(site, route)}>; rel="canonical"`);
        comparisonFacts(response.body, route, true);
      }
    });
  }
}

async function comparisonMatrix() {
  const pair = catalog.comparePairs[0];
  const canonicalPath = `/compare/${pair.a}-vs-${pair.b}`;
  let uncurated;
  for (const a of published) {
    const b = published.find((b) => a.slug < b.slug && !catalog.comparePairs.some((row) => [row.a, row.b].includes(a.slug) && [row.a, row.b].includes(b.slug)));
    if (b) { uncurated = [a.slug, b.slug]; break; }
  }
  assert.ok(uncurated);
  const [a, b] = uncurated;
  const cases = [
    { site: "people", route: canonicalPath, status: 200, indexable: true },
    { site: "people", route: `/compare/${pair.b}-vs-${pair.a}?next=https://elsewhere.invalid/`, status: 308, location: canonicalPath },
    { site: "people", route: `/compare/${a}-vs-${b}`, status: 200, indexable: false },
    { site: "people", route: `/compare/${b}-vs-${a}`, status: 308, location: `/compare/${a}-vs-${b}`, indexable: false },
    ...[`${pair.a}-vs-${pair.a}`, `${pair.a}-vs-s03-unknown`, `${pair.a}-vs-`, `${pair.a}-vs-${pair.b}-vs-${a}`].map((value) => ({ site: "people", route: `/compare/${value}`, status: 404 })),
    { site: "agents", route: canonicalPath, status: 404 },
  ];
  for (const entry of cases) for (const method of ["GET", "HEAD"]) for (const ua of [browser, crawler]) for (const representation of ["html", "negotiated-md", "direct-md"]) {
    const markdown = representation !== "html";
    const route = representation === "direct-md" ? `/md${entry.route}` : entry.route;
    await check(`${entry.site} comparison ${method} ${ua === crawler ? "Googlebot" : "browser"} ${representation} ${entry.route}`, async () => {
      const response = await request(entry.site, route, { method, ua, accept: markdown ? "text/markdown" : "text/html" });
      status(response, entry.status);
      if (method === "HEAD") assert.equal(response.body, "", "HEAD body empty");
      if (entry.status === 308) {
        assert.equal(response.headers.location, entry.location, "relative public fixed Location");
        if (markdown) assert.equal(response.body, "");
        const target = await request(entry.site, entry.location, { method, ua, accept: markdown ? "text/markdown" : "text/html" });
        status(target, 200);
        if (method === "GET" && !markdown) htmlPage(target, entry.site, entry.location, { indexable: entry.indexable !== false });
        if (markdown && entry.indexable === false) assert.equal(target.headers["x-robots-tag"], "noindex, follow");
      } else if (entry.status === 200) {
        if (method === "GET" && !markdown) htmlPage(response, entry.site, entry.route, { indexable: entry.indexable });
        if (markdown) {
          type(response, "text/markdown"); vary(response);
          assert.equal(response.headers.link, `<${publicUrl(entry.site, entry.route)}>; rel="canonical"`);
          if (!entry.indexable) assert.equal(response.headers["x-robots-tag"], "noindex, follow");
          else assert.ok(!response.headers["x-robots-tag"]?.includes("noindex"));
          if (method === "GET") comparisonFacts(response.body, entry.route, true);
        }
      } else if (method === "GET") {
        assert.ok(!response.body.includes("NEXT_REDIRECT"), "404 is not a redirect shell");
        if (markdown) { type(response, "text/markdown"); assert.match(response.body, /# Not found/); }
      }
    });
  }
}

async function feeds(site) {
  // Articles have no publication-status field; allArticles() returns this list.
  const oldArticles = baseline.articles;
  const oldProducts = baseline.products.filter((p) => p.status === "published").slice(0, 20);
  for (const format of ["rss", "atom"]) await check(`${site} ${format} links and historical IDs`, async () => {
    const response = await request(site, format === "rss" ? "/feed.xml" : "/atom.xml");
    status(response, 200); type(response, "xml");
    const entries = xmlValues(response.body, format === "rss" ? "item" : "entry");
    assert.equal(entries.length, oldArticles.length + (format === "rss" ? oldProducts.length : 0));
    const oldBase = `https://buildsomething${site}want.com`;
    const expectedIds = oldArticles.map((a) => `${oldBase}/${format === "rss" && site === "agents" ? "products" : "blog"}/${a.slug}`);
    if (format === "rss") expectedIds.push(...oldProducts.map((p) => `${oldBase}/products/${p.slug}`));
    const ids = entries.flatMap((entry) => xmlValues(entry, format === "rss" ? "guid" : "id"));
    assert.deepEqual(ids, expectedIds, "opaque subscription identities preserved");
    if (format === "rss") assert.equal([...response.body.matchAll(/<guid isPermaLink="false">/g)].length, entries.length);
    else assert.equal(xmlValues(response.body, "id")[0], `${oldBase}/`, "feed ID preserved");
    const links = entries.map((entry) => format === "rss" ? xmlValues(entry, "link")[0] : tags(entry, "link").find((tag) => !tag.rel || tag.rel === "alternate")?.href);
    assert.deepEqual(links.slice(0, oldArticles.length), oldArticles.map((article) => publicUrl("people", `/blog/${article.slug}`)), "all seven article destinations are people blogs");
    const channel = format === "rss" ? xmlValues(response.body.replace(/<item\b[\s\S]*?<\/item>/g, ""), "link")[0] : tags(response.body, "link").find((tag) => tag.rel === "self")?.href;
    assert.equal(channel, publicUrl(site, format === "rss" ? "/" : "/atom.xml"));
    for (const link of links) {
      const target = localTarget(link);
      const page = await request(target.site, target.route);
      htmlPage(page, target.site, target.route);
    }
  });
}

async function discovery(site) {
  await check(`${site} robots and llms www origins`, async () => {
    const robots = await request(site, "/robots.txt"); status(robots, 200); type(robots, "text/plain");
    assert.ok(robots.body.includes(`Sitemap: ${publicUrl(site, "/sitemap.xml")}`));
    for (const route of ["/llms.txt", "/llms-full.txt"]) {
      const response = await request(site, route); status(response, 200); type(response, "text/plain");
      assert.ok(response.body.includes(publicUrl(site, "/products/chatgpt")));
      assert.ok(response.body.includes("We do not emit AggregateRating"));
      assert.doesNotMatch(response.body, /https:\/\/buildsomething(?:people|agents)want\.com(?:\/|\b)/);
    }
  });
  const paths = ["/openapi.json", "/.well-known/api-catalog", "/.well-known/ai-catalog.json", "/api/v1"];
  if (site === "agents") paths.push("/dataset/twin-scores.json", "/dataset/twin-scores.csv", "/.well-known/agent-skills/index.json");
  for (const route of paths) await check(`${site} discovery ${route}`, async () => {
    const response = await request(site, route); status(response, 200);
    if (route.endsWith(".csv")) { type(response, "text/csv"); assert.ok(response.body.includes("chatgpt")); return; }
    type(response, "json"); const data = JSON.parse(response.body); inspectInternalUrls(data);
    if (route === "/openapi.json") assert.deepEqual(data.servers, [{ url: publicUrl(site, "/") }]);
    if (route === "/.well-known/api-catalog") assert.equal(data.linkset[0].anchor, publicUrl(site, "/api/v1/products"));
    if (route === "/.well-known/ai-catalog.json") {
      assert.equal(data.website, canonical[site]);
      assert.equal(data.products.length, published.length);
      for (const row of data.products) assert.equal(row.url, publicUrl(site, `/products/${row.slug}`));
    }
    if (route.includes("agent-skills")) for (const row of data.skills) {
      assert.equal(row.url, publicUrl(site, `/skills/${row.name}`)); assert.equal(row.markdown, publicUrl(site, `/skills/${row.name}/raw`));
      const raw = await request(site, `/skills/${row.name}/raw`); status(raw, 200); type(raw, "text/markdown");
      assert.ok(raw.body.includes(`Rubric: ${publicUrl("agents", "/scorecard")}`));
    }
  });
}

async function regressions(site) {
  for (const route of [`/products/${catalog.retiredSlugs[0]}`, site === "people" ? `/alternatives/${catalog.retiredSlugs[0]}` : `/skills/${catalog.retiredSlugs[0]}`]) {
    for (const accept of ["text/html", "text/markdown"]) await check(`${site} retired ${route} ${accept}`, async () => status(await request(site, route, { accept }), 410));
    await check(`${site} retired direct Markdown ${route}`, async () => status(await request(site, `/md${route}`, { accept: "text/markdown" }), 410));
  }
  await check(`${site} API method, 406 and RSC bypass`, async () => {
    status(await request(site, "/api/v1/products/chatgpt", { method: "POST", accept: "application/json" }), 405);
    status(await request(site, "/api/v1/products/chatgpt", { method: "OPTIONS", accept: "application/json" }), 204);
    status(await request(site, "/products/chatgpt", { accept: "image/avif" }), 406);
    const rsc = await request(site, "/products/chatgpt", { accept: "text/markdown", headers: { RSC: "1" } });
    status(rsc, 200);
    assert.ok(!rsc.headers["content-type"]?.includes("text/markdown"), "Next internal request must bypass Markdown negotiation");
  });
  for (const route of ["/auth/recovery?code=s03-dummy&next=https://elsewhere.invalid/", "/reset-password", "/reset-password?error=unavailable"]) for (const mode of ["HTML", "Markdown", "RSC"]) await check(`${site} unconfigured Auth ${mode} ${route}`, async () => {
    const response = await request(site, route, { accept: mode === "Markdown" ? "text/markdown" : "text/html", headers: mode === "RSC" ? { RSC: "1" } : {} });
    assert.equal(response.headers["cache-control"], "private, no-store");
    assert.equal(response.headers["x-robots-tag"], "noindex, nofollow");
    assert.equal(response.headers["referrer-policy"], "no-referrer");
    assert.equal(response.headers.pragma, "no-cache"); assert.equal(response.headers.expires, "0");
    assert.ok(!response.headers["set-cookie"]);
    if (route.startsWith("/auth/")) {
      status(response, 303); assert.equal(response.headers.location, `${bases[site]}/reset-password?error=unavailable`);
    } else {
      status(response, 200); assert.ok(response.body.includes("Password reset is temporarily unavailable."));
      assert.doesNotMatch(response.body, /<input[^>]*type="password"/i);
      type(response, mode === "RSC" ? "text/x-component" : "text/html");
    }
  });
}

console.log(JSON.stringify({ bases, historicalCuratedPaths: expectedPairs, publishedProducts: products.size, baselineArticles: baseline.articles.length }));
for (const site of sites) { await sitemap(site); await feeds(site); await discovery(site); await regressions(site); }
await comparisonMatrix();
const summary = { mode: retryLabels ? "retry-recorded-failures" : "full", requests: records.length, failedChecks: failures.length, inventoryCounts: Object.fromEntries(sites.map((site) => [site, inventory[site].length])), inventory, failures: failures.map(({ label, error }) => ({ label, error })) };
await writeFile(`${output}/requests.json`, JSON.stringify(records, null, 2));
await writeFile(`${output}/summary.json`, JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ RESULT: failures.length ? "FAIL" : "PASS", ...summary }));
process.exitCode = failures.length ? 1 : 0;
