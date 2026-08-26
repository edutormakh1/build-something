import { NextResponse } from "next/server";
import { MARKDOWN_CONTENT_TYPE, goneMd, pageMarkdown } from "@bs/seo";

export async function GET(_req: Request, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path } = await ctx.params;
  const pathname = "/" + (path?.join("/") || "");
  const result = pageMarkdown("agents", pathname);
  const headers = { "content-type": MARKDOWN_CONTENT_TYPE, vary: "Accept" };
  if (result.status === 410) {
    return new NextResponse(result.body, { status: 410, headers });
  }
  if (result.status === 404) {
    return new NextResponse(result.body, { status: 404, headers });
  }
  return new NextResponse(result.body, { status: 200, headers });
}
