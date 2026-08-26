import { reviewsPayload } from "@bs/seo";
export function GET(req: Request) {
  const url = new URL(req.url);
  const product = url.searchParams.get("product") || undefined;
  return Response.json({ data: reviewsPayload(product) });
}
