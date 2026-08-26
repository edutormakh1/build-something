import { apiCatalog } from "@bs/seo";

export function GET() {
  return new Response(JSON.stringify(apiCatalog("people")), {
    headers: {
      "content-type": "application/linkset+json; charset=utf-8",
      "access-control-allow-origin": "*",
    },
  });
}
