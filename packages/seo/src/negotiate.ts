export type MediaType = "text/html" | "text/markdown" | "application/json" | "text/plain";

type Parsed = { type: string; q: number };

function parseAccept(header: string): Parsed[] {
  return header
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [type, ...params] = part.split(";").map((s) => s.trim());
      let q = 1;
      for (const param of params) {
        const [k, v] = param.split("=").map((s) => s.trim());
        if (k === "q") q = Number(v);
      }
      return { type: type.toLowerCase(), q: Number.isFinite(q) ? q : 1 };
    })
    .sort((a, b) => b.q - a.q);
}

function matches(offered: string, accepted: string): boolean {
  if (accepted === "*/*") return true;
  if (accepted === offered) return true;
  const [aType, aSub] = accepted.split("/");
  const [oType, oSub] = offered.split("/");
  if (aType === oType && aSub === "*") return true;
  return false;
}

export function negotiate(acceptHeader: string | null | undefined, offered: MediaType[]): MediaType | null {
  const header = (acceptHeader || "*/*").trim();
  if (!header) return offered[0] ?? null;
  const parsed = parseAccept(header);
  for (const item of parsed) {
    if (item.q <= 0) continue;
    const hit = offered.find((o) => matches(o, item.type));
    if (hit) return hit;
  }
  return null;
}

export function isNextInternalRequest(headers: { get(name: string): string | null }): boolean {
  return Boolean(
    headers.get("rsc") ||
      headers.get("next-router-state-tree") ||
      headers.get("next-router-prefetch") ||
      headers.get("next-action"),
  );
}

export const MARKDOWN_CONTENT_TYPE = "text/markdown; charset=utf-8";
export const HTML_CONTENT_TYPE = "text/html; charset=utf-8";
export const PROBLEM_JSON = "application/problem+json";

export function shouldSkipAcceptNegotiation(pathname: string): boolean {
  // The raw skill route already serves fixed Markdown and enforces publication.
  if (/^\/skills\/[^/]+\/raw$/.test(pathname)) return true;
  if (/\.(?:png|jpe?g|gif|webp|avif|svg|ico|css|js|map|woff2?|ttf|txt|xml|json|csv)$/i.test(pathname)) {
    return true;
  }
  const prefixes = [
    "/_next",
    "/api/",
    "/sitemap",
    "/robots.txt",
    "/llms",
    "/openapi",
    "/.well-known",
    "/feed",
    "/rss",
    "/atom",
    "/art/",
    "/favicon",
    "/dataset/",
  ];
  if (pathname === "/md" || pathname.startsWith("/md/")) return true;
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}

export function normalizeWorkerRequest(request: Request): Request {
  if ((request.method !== "GET" && request.method !== "HEAD") ||
      request.headers.get("rsc") !== "1" || request.headers.has("next-action") ||
      shouldSkipAcceptNegotiation(new URL(request.url).pathname) ||
      negotiate(request.headers.get("accept"), ["text/html", "text/markdown"]) !== "text/markdown") {
    return request;
  }
  // Next strips Flight headers before middleware. Use the real client's Accept
  // while leaving the raw RSC marker available for the generated Worker.
  const headers = new Headers(request.headers);
  headers.set("accept", "*/*");
  return new Request(request, { headers });
}
