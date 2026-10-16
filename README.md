# Build Something

Worldwide Twin Score directory. Two sites, one catalog:

- People (humans): https://buildsomethingpeoplewant.com — `apps/people`
- Agents (machines): https://buildsomethingagentswant.com — `apps/agents`

Owner: Edu Tor ([edutormakh1](https://github.com/edutormakh1)). Remote: https://github.com/edutormakh1/build-something.git

Public catalog pages read the committed `packages/db/seed/catalog.json`. Account submissions are separate and do not publish automatically. Twin Scores are retained legacy editorial estimates without attached firsthand test logs. No fake UGC.

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

## Hosting on Cloudflare Workers

The two apps are configured to deploy as independent Workers using OpenNext. Supabase continues to provide accounts,
profiles and pending review submissions; public reviews are read from the committed catalog. This hosting change does not migrate or modify the database.

- `apps/people/wrangler.jsonc` → `build-something-people`
- `apps/agents/wrangler.jsonc` → `build-something-agents`

Use Node.js 22 or later and the pinned pnpm version. Install the whole workspace before building:

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm build:cloudflare
pnpm check:cloudflare
```

`build:cloudflare` builds both Next.js apps and adapts them to the Workers runtime.
`check:cloudflare` bundles both Workers locally with Wrangler's `--dry-run`; it does not publish.
For local runtime checks, run either `pnpm --filter @bs/people preview:cloudflare` or
`pnpm --filter @bs/agents preview:cloudflare`. The previews build first.

The catalog can build without Supabase credentials. For a deployment with working sign-in, provide
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` at **build time** in both apps' ignored
`.env.local` files or in the build environment. Next.js embeds public variables in browser code.
Keep the existing production project and data. The site origins in each Wrangler configuration
are the existing domains, so links and password-reset redirects continue to target those domains.

After authenticating Wrangler with the intended permanent Cloudflare account (`wrangler login`,
or `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in the deployment environment):

```bash
pnpm deploy:cloudflare
```

First verify both resulting `workers.dev` URLs, including HTML and Markdown negotiation, API errors,
static art and sign-in. Then attach the existing custom domains to their respective Workers through
Cloudflare. Domain activation requires access to the authoritative DNS zones. Do not remove the
Vercel deployments until the custom domains and auth redirects are verified on Cloudflare.

The configuration uses a read-only Workers Static Assets cache for build-time catalog pages,
with cache interception to avoid loading the full Next.js server for cached pages. Account pages
and APIs remain dynamic. It does not provision R2, D1, KV, or paid services. Revalidation and
runtime cache writes require replacing this read-only cache with a persistent ISR cache. Deploying to Workers does not remove Supabase's
own limits. Cloudflare Free has a shared account quota of 100,000 dynamic requests/day and 10 ms
CPU/request, so verify production CPU usage before treating it as a sufficient free hosting plan.
See [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) and
[limits](https://developers.cloudflare.com/workers/platform/limits/).

### Existing Vercel deployment

Vercel remains a rollback option. Both projects build from this monorepo: root directory
`apps/people` for `buildsomethingpeoplewant.com`, and `apps/agents` for
`buildsomethingagentswant.com`. The normal `pnpm build` command remains available.

## Admin

`/admin` on the people app lists profiles when the signed-in user has `is_admin`. The public form does not offer an admin-role field. Database-side permission enforcement has not been verified by this editorial audit. Account/profile approvals and pending submissions are separate from the committed public catalog; approving a database row does not publish a review here. No automated submission-to-publication workflow is enabled in this version.

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

## Production and SEO execution plan

The agent execution plan, acceptance criteria and prioritized backlog are in [plans/production-seo-aeo/plan.md](plans/production-seo-aeo/plan.md). Use `lead:run` from this repo to resume the recorded work; deployment and measured search results remain separate milestones.
