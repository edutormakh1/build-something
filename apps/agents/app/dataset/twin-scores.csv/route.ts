import { allProducts } from "@bs/db";

export function GET() {
  const rows = ["slug,name,vendor,category,human,agent,updated,api,mcp,cli"];
  for (const p of allProducts()) {
    rows.push([p.slug, csv(p.name), csv(p.vendor), p.category, p.twin.human, p.twin.agent, p.twin.updated, p.capabilities.api, p.capabilities.mcp, p.capabilities.cli].join(","));
  }
  const csvBody = rows.join("\n") + "\n";
  return new Response(csvBody, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=twin-scores.csv" } });
}
function csv(s: string) {
  if (s.includes(",") || s.includes('"')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
