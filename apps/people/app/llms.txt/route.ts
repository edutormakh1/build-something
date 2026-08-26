import { llmsTxt } from "@bs/seo";
export function GET() {
  return new Response(llmsTxt("people"), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
