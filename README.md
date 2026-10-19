# Build Something

Worldwide Twin Score directory. Two sites, one catalog:

- People (humans): https://www.buildsomethingpeoplewant.com — `apps/people`
- Agents (machines): https://www.buildsomethingagentswant.com — `apps/agents`

Owner: Edu Tor ([edutormakh1](https://github.com/edutormakh1)). Remote: https://github.com/edutormakh1/build-something.git

Public catalog pages read the committed `packages/db/seed/catalog.json`. Account submissions are separate and do not publish automatically. Twin Scores are retained legacy editorial estimates without attached firsthand test logs. No fake UGC.

## Active production hosting — 19 October 2026

Both canonical `www` sites serve the minimal Next.js UI and the owner's original mosaic from
source `989addd145ab7f315d36c8bb30b8c487e57c9a67`. Requests flow through Cloudflare Free zones
and Cloudflare Tunnel to two ordinary Next.js apps on Ubuntu. HTTP redirects to HTTPS;
HTTPS apex redirects to `www`, preserving paths and queries. The current domains do not use Workers.

The immutable installed release is `~/.local/share/build-something/releases/20261019-989addd`,
with its own AMB identity `wa5ad7fb4482cf57b`: People listens on 21775 and Agents on 21776.
The dedicated `build-something-ui-people.service`, `build-something-ui-agents.service` and
`build-something-prod-connector.service` were recorded enabled and active at cutover. These are
installed operational units; checked-in `.example` files are generic templates, not their configuration.
Ubuntu must stay connected and awake to serve visitors. Cold-reboot recovery and sustained production
performance have not been accepted; Free zone + Tunnel does not mean Workers Paid or unlimited capacity.

Heavy candidate work is bounded to 03:00–06:00 `America/Argentina/Buenos_Aires`. The installed
nightly runner remains pinned separately to `e46ad116345a6f93290bad815bcdf9ef986e2370` in
`~/.local/share/build-something/nightly-source`, AMB `wa45c5a672e5dbbe2`. Its timer was activated,
but activation does not prove a successful night. It does not pull source, verify facts, publish,
promote a release or restart production. Future source changes are not automatically promoted;
no current GitHub/CI production deployment credentials or automation are established here.
See [the Ubuntu operating contract](ops/ubuntu/README.md).

Supabase remains the account backend; the public catalog remains committed JSON. Hosting did not
migrate the database or accept real login, recovery email/SMTP or Auth allowlists. Only the no-code
recovery redirect (303 to the invalid-code page) passed. Scoped public-hosting reviews do not close
full D02, Auth or SEO/AEO; Search Console, Bing, indexing, rankings, citations and revenue remain unmeasured.

Rollback retains the old `production-ed28` configuration/release, while the old apps on 21451/21452
are stopped and disabled. Vercel remains registrar and fallback, with projects, attachments and DNS
retained. Keep the shared fallback at least until **2026-10-26T05:45:10.205629Z**, and through observed
cache horizons; this date does not trigger deletion. The recorded Vercel fallback certificate expires
24 November 2026 and automatic renewal is unknown. No renewal, billing change or Cloudflare Paid plan
is authorized. All five old Workers and both preview Workers remain retained.

The final evidence is `People-final-cutover-result-review1.md` and
`Agents-final-cutover-result-review1.md` in the external Lead run
`~/.lead/github.com/edutormakh1/build-something/runs/chore/cloudflare-hosting/`.
The earlier `UI-production-989addd-result-review1.md` is an intermediate activation snapshot;
its Agents-public/People-apex pending statements were superseded by those final hosting reviews.

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

The apps use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`; these are public build inputs.
`SUPABASE_SERVICE_ROLE_KEY` is privileged and is not required by the current app code. Never put it in
`NEXT_PUBLIC_*`, browser bundles, committed files or public Wrangler vars. Keep private credentials in their existing secret store.

## Alternative / historical Cloudflare Workers hosting

This retained runbook describes a separate OpenNext/Workers alternative, not the active
Ubuntu + Tunnel deployment. `pnpm deploy:cloudflare` is not the ordinary production release path.
The occupied-name, binding, security and rollback gates below still apply to any future Workers replacement.

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
For isolated local validation, use the guarded preview flow from a clean committed checkout:

```bash
pnpm cloudflare:preview:build people
pnpm cloudflare:preview:check people
pnpm cloudflare:preview:build agents
pnpm cloudflare:preview:check agents
pnpm cloudflare:preview:smoke local
```

These commands build, dry-run and smoke local Workers without publishing. They validate preview configuration,
source/artifact markers, placeholder public Supabase settings and preview noindex behaviour. They do not certify
production settings, account capacity or hosted behaviour. On Ubuntu, run through the checkout's own AMB queues.

The catalog can build without Supabase credentials. For a deployment with working sign-in, provide
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` at **build time** in both apps' ignored
`.env.local` files or in the build environment. Next.js embeds public variables in browser code.
Keep the existing production project and data. The site origins in each Wrangler configuration
are the existing domains, so links and password-reset redirects continue to target those domains.

### Alternative Workers production replacement runbook

**Both configured production names are occupied.** The recorded account inventory found
`build-something-people` and `build-something-agents` running a different implementation with an
`API` service binding to `build-something-api`, plus `ASSETS` and `SITE`. The current configs/dry-runs
instead contain `WORKER_SELF_REFERENCE`, `ASSETS` and two public site URL vars. Deploying these configs
blindly can remove the old bindings. Authentication alone is not a deployment prerequisite check.

Execute the following sequence for **one specifically reviewed target at a time**:

1. **Refresh the inventory before any write.** Verify the intended account identity, actual Workers plan,
   exact script name, current deployments/versions, complete bindings and settings, service dependencies,
   routes, custom domains and preview settings. The recorded inventory is historical; absent custom domains
   do not establish that a Worker or binding is unused. Preserve all five legacy Workers
   (`build-something-people`, `build-something-agents`, `build-something-api`, `keepanalog-correcciones`,
   `keepanalog-resumidor`) and both existing preview Workers/settings except for an individually reviewed target operation.
2. **Capture rollback before replacement.** For each target, save its current **deployment ID** and all
   **version IDs/traffic allocations**, plus a complete binding/settings snapshot, in the secure operational
   record outside the repository. Include routes/domain attachments and dependency versions; record secret
   binding names/references without exporting secret values into logs or source. Preserve the old versions,
   their assets and dependent services. Verify access to the selected rollback version and the ability to
   restore required settings before deploying.
3. **Write down an executable per-target rollback procedure.** The pinned Wrangler **4.151.1** local
   `rollback --help` specifies `rollback [version-id]` and `--name`: the argument is a **Worker version ID**,
   not a deployment ID. Prepare the appropriate command below with that target's verified prior stable
   version ID and the verified account environment. Do not leave the ID unset or omit it and rely on defaults.

   ```bash
   pnpm --filter @bs/people exec wrangler rollback "${PEOPLE_ROLLBACK_VERSION_ID:?record the verified People version ID}" --name build-something-people
   pnpm --filter @bs/agents exec wrangler rollback "${AGENTS_ROLLBACK_VERSION_ID:?record the verified Agents version ID}" --name build-something-agents
   ```

   These are separate rollback commands, not deployment steps. Recheck the installed CLI's help if the pin
   changes. If the existing deployment splits traffic across versions, prepare a verified procedure to restore
   that distribution; a single-version rollback is not equivalent. Also specify how to restore bindings/settings,
   routes, DNS and domain attachments and verify the old service: do not assume a code rollback restores them all.
4. **Reconcile every old binding and dependency.** Compare the snapshot with the proposed SELF/ASSETS
   configuration. Retain each old binding, including `API` and `SITE`, or explicitly cover its retirement and
   affected consumers in the migration review for that exact target. Resolve any required config changes
   before deployment; the checked-in production configs do not by themselves prove this reconciliation.
5. **Establish production readiness for the exact candidate.** Require reviewed source and matching build
   artifacts, reviewed binding/config diffs, the actual account plan and attributable CPU/log evidence, and real
   production Supabase public build settings. Verify Auth redirect allowlists, cookie/origin behaviour and
   recovery/SMTP dependencies with the owner. A placeholder local build or the existing dry-run is not this evidence.
   No Paid plan, zone upgrade or other new spending is authorized by this runbook.
6. **Prepare domain and mail preservation.** Export the complete current Vercel/Cloudflare DNS zones,
   domain attachments and redirect rules, and registrar NS/DS settings before any change. Preserve the existing
   HTTPS `www` destinations, apex-to-www/HTTP-to-HTTPS redirects, URL paths and queries, and every mail,
   verification, delegated-subdomain and API record. Empty public MX/TXT answers are not evidence that mail
   is unused. Confirm actual target TLS/CAA readiness and a reviewed per-host cutover and rollback procedure;
   do not use a broad wildcard route or improvise an NS move. Keep Vercel hosting, domain/project attachments
   and old DNS configuration available for rollback. No destructive mail/DNS operation is authorized here.
7. **Deploy and verify only the reviewed target.** Deployment is a separate target operation after the above
   gates, not a follow-up to login. The manual root `deploy:cloudflare` script affects **both occupied names**;
   use it only when both replacements and their sequence meet these prerequisites. Record the new deployment
   and version IDs, then check the target's HTML/Markdown, advertised skill raw downloads, API/status contracts,
   assets and Auth configuration before switching its web traffic. Preserve preview noindex settings. Verify
   apex/www TLS, redirects with paths/queries, canonical origins and unchanged mail/API records after cutover;
   use the recorded per-target rollback on failure. Do not delete Vercel fallback after a successful root GET.

The normal migration is already authorized; these are evidence and target-review gates, not a new routine
human approval flow. Missing account ownership/access or materially new irreversible scope must be resolved
separately. For any future Workers cutover, refresh account/zone status, Workers CPU fit, full DNS/mail inventory,
production Auth settings and target TLS/rollback readiness; the Ubuntu hosting result does not satisfy
these alternative-runtime gates.

The configuration uses a read-only Workers Static Assets cache for build-time catalog pages,
with cache interception to avoid loading the full Next.js server for cached pages. Account pages
and APIs remain dynamic. It does not provision R2, D1, KV, or paid services. Revalidation and
runtime cache writes require replacing this read-only cache with a persistent ISR cache. Deploying to Workers does not remove Supabase's
own limits. Verify the actual account plan, applicable request/CPU limits and measured production workload
before treating the available hosting tier as sufficient; local dry-runs do not establish Free-plan fit.
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

- https://www.buildsomethingagentswant.com/dataset/twin-scores.json
- https://www.buildsomethingagentswant.com/dataset/twin-scores.csv

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
