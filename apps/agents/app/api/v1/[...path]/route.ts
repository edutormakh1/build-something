import { apiMethodNotAllowed, apiOptionsResponse } from "@bs/seo";
import { handleUnknownApiRoute } from "@bs/seo";
export function GET(req: Request) {
  return handleUnknownApiRoute(new URL(req.url).pathname);
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
