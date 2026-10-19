import { NextResponse } from "next/server";
import { abs, MARKDOWN_CONTENT_TYPE, pageMarkdown } from "@bs/seo";

export async function GET(_req: Request, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path } = await ctx.params;
  const pathname = "/" + (path?.join("/") || "");
  const result = pageMarkdown("agents", pathname);
  const headers = new Headers({ "content-type": MARKDOWN_CONTENT_TYPE, vary: "Accept" });
  if (result.status === 308) headers.set("Location", result.location);
  if (result.status === 200) {
    if (result.canonicalPath) headers.set("Link", `<${abs("agents", result.canonicalPath)}>; rel="canonical"`);
    if (result.robots) headers.set("X-Robots-Tag", result.robots);
  }
  return new NextResponse(result.body, { status: result.status, headers });
}
