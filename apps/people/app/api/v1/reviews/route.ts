import { apiMethodNotAllowed, apiOptionsResponse } from "@bs/seo";
import { handleListReviews } from "@bs/seo";
export function GET(req: Request) {
  const url = new URL(req.url);
  return handleListReviews(url.searchParams.get("product"), url.pathname);
}
export function OPTIONS() {
  return apiOptionsResponse();
}
export function POST(req: Request) {
  return apiMethodNotAllowed(new URL(req.url).pathname);
}
export function PUT(req: Request) {
  return apiMethodNotAllowed(new URL(req.url).pathname);
}
export function PATCH(req: Request) {
  return apiMethodNotAllowed(new URL(req.url).pathname);
}
export function DELETE(req: Request) {
  return apiMethodNotAllowed(new URL(req.url).pathname);
}
