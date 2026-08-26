import { apiMethodNotAllowed, apiOptionsResponse } from "@bs/seo";
import { handleApiIndex } from "@bs/seo";
export function GET() {
  return handleApiIndex("agents");
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
