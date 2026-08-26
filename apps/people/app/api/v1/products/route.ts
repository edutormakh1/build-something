import { listProducts } from "@bs/seo";
export function GET() {
  return Response.json({ data: listProducts() });
}
