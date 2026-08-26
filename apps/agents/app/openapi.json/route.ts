import { openApi } from "@bs/seo";
export function GET() {
  return Response.json(openApi("agents"));
}
