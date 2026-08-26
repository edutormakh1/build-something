import { apiMethodNotAllowed, apiOptionsResponse } from "@bs/seo";
import { handleListProducts } from "@bs/seo";
export function GET() {
  return handleListProducts();
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
