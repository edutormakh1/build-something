# Build Something

Worldwide Twin Score directory. Two sites, one catalog:

- People (humans): https://buildsomethingpeoplewant.com — `apps/people`
- Agents (machines): https://buildsomethingagentswant.com — `apps/agents`

Owner: Edu Tor ([edutormakh1](https://github.com/edutormakh1)). Remote: https://github.com/edutormakh1/build-something.git

Public catalog pages render from `packages/db/seed/catalog.json` so the sites work before Supabase secrets land. No fake UGC. Editorial Twin Scores only.

## Stack

Turborepo + pnpm workspaces. Next.js App Router, TypeScript, Tailwind. Shared packages: `@bs/db`, `@bs/ui`, `@bs/seo`, `@bs/auth`.

## Run locally

```bash
pnpm install
pnpm --filter @bs/people dev
pnpm --filter @bs/agents dev
```

People defaults to port 3000, agents to 3001.

```bash
pnpm test
pnpm build
```

## Environment

Copy `.env.example` to `apps/people/.env.local` and `apps/agents/.env.local`.

Supabase project (already exists, schema already applied — do not drop):

- project_id: `slkrntjfavigfhbkeyoa`
- project name: `build-something`
- region: sa-east-1
- URL: `https://slkrntjfavigfhbkeyoa.supabase.co`

Keys: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

## Vercel

Create **two** projects from this repo:

1. Root directory `apps/people` → domain `buildsomethingpeoplewant.com`
2. Root directory `apps/agents` → domain `buildsomethingagentswant.com`

Set the env vars on both. Include `NEXT_PUBLIC_PEOPLE_SITE_URL` and `NEXT_PUBLIC_AGENTS_SITE_URL`. Password reset redirects are site-correct (people origin vs agents origin).

Install `pnpm` on Vercel (the repo `packageManager` field pins 9.15.9).

## Admin

`/admin` on the people app lists profiles when the signed-in user has `is_admin`. Approve members in Supabase (`profiles.status`). Users cannot set `is_admin` on themselves through the public form. Approved `can_review` users may insert pending user/agent reviews.

## Unique feature

Twin Pages + Twin Score + public rubric + downloadable CSV/JSON (CC BY 4.0) at:

- https://buildsomethingagentswant.com/dataset/twin-scores.json
- https://buildsomethingagentswant.com/dataset/twin-scores.csv

Developer resources page title: **Build Something Agents Want developer resources** (`/for-agents` on the agents site), linked from `llms.txt`.

MCP is omitted rather than faked.

## is-agentic curl checks

Start the people app, then:

```bash
curl -s http://localhost:3000/ | grep -o "<h1>[^<]*</h1>"
curl -s http://localhost:3000/ | wc -c
curl -sI -H "Accept: text/markdown" http://localhost:3000/products/chatgpt
curl -s -H "Accept: text/markdown" http://localhost:3000/products/chatgpt | head
curl -s -o /dev/null -w "%{http_code}" -H "Accept: application/xml" http://localhost:3000/about
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/this-page-is-missing
curl -s http://localhost:3000/robots.txt
curl -s http://localhost:3000/sitemap.xml
curl -s http://localhost:3000/llms.txt | head
curl -s http://localhost:3000/.well-known/ai-catalog.json | head
curl -s http://localhost:3000/api/v1/products/chatgpt
curl -s http://localhost:3000/api/v1/products/not-a-product
curl -s http://localhost:3000/openapi.json | head
curl -s http://localhost:3000/feed.xml | head
```

Expect: H1 in HTML (SSR text column, not only a canvas); body well over 500 characters; markdown responses with `Content-Type: text/markdown; charset=utf-8` and `Vary: Accept`; 406 when Accept cannot be satisfied; 404 for unknown pages; robots allowing Googlebot and the listed AI crawlers plus Sitemap; sitemap index with lastmod and without /admin or /login; JSON-LD in HTML source; RFC 9457 problem+json for missing API slugs. `/art/` 3D assets must not be rewritten by Accept negotiation.

Repeat against port 3001 for the agents app (`/skills/chatgpt`, `/.well-known/agent-skills/index.json`, `/dataset/twin-scores.json`).

## License of the dataset

Catalog Twin Scores: CC BY 4.0. Code: all rights reserved to Edu Tor unless noted.
