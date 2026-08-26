import { llmsFullTxt } from "@bs/seo";
export function GET() {
  return new Response(llmsFullTxt("agents"), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
