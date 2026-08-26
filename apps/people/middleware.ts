import { NextResponse, type NextRequest } from "next/server";
import { apiV1MethodGate, isNextInternalRequest, negotiate, shouldSkipAcceptNegotiation } from "@bs/seo";
import { catalog } from "@bs/db";
import { updateSession } from "@bs/auth/middleware";


export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const apiGate = apiV1MethodGate(req.method, path);
  if (apiGate) {
    return new NextResponse(apiGate.body, { status: apiGate.status, headers: apiGate.headers });
  }
  const retired = catalog.retiredSlugs.find((s) => path === `/products/${s}` || path === `/alternatives/${s}`);
  if (retired) {
    const html = `<!doctype html><html lang="en"><head><title>Gone</title></head><body><main id="main"><h1>Gone</h1><p>${retired} is retired from this catalog.</p><h2>Recover</h2><p><a href="/products">All products</a></p><h3>Status</h3><p>HTTP 410</p></main></body></html>`;
    return new NextResponse(html, { status: 410, headers: { "content-type": "text/html; charset=utf-8", vary: "Accept" } });
  }
  if (isNextInternalRequest(req.headers) || shouldSkipAcceptNegotiation(path)) {
    return updateSession(req);
  }
  const chosen = negotiate(req.headers.get("accept"), ["text/html", "text/markdown"]);
  if (!chosen) {
    return new NextResponse("Not Acceptable", {
      status: 406,
      headers: { "content-type": "text/plain; charset=utf-8", vary: "Accept" },
    });
  }
  if (chosen === "text/markdown") {
    const url = req.nextUrl.clone();
    url.pathname = path === "/" ? "/md" : `/md${path}`;
    const res = NextResponse.rewrite(url);
    res.headers.set("vary", "Accept");
    return res;
  }
  const res = await updateSession(req);
  res.headers.set("vary", "Accept");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|art/).*)"],
};
