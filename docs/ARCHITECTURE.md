# EasyFinder Architecture

Canonical architecture and runtime map for EasyFinder. For endpoint and schema truth, use `openapi.yml`.

## Monorepo services

- `apps/api` — Fastify API with auth, NDA gating, listings/seller/admin workflows, billing, and scraper orchestration.
- `apps/web` — Vite + React client with buyer/seller app routes and admin surfaces.
- `packages/shared` — shared domain contracts and scoring logic.

## Workspace and root contract files

- `openapi.yml` — canonical API contract.
- `package.json` — workspace scripts (`typecheck`, `build`, `lint`, `test`, `openapi:types`).
- `pnpm-workspace.yaml` — workspace package selection.
- `turbo.json` — task pipeline orchestration.
- `.github/workflows/ci.yml` — CI gates and OpenAPI generation checks.

## API functional areas (`apps/api`)

- Auth/session/profile (`/api/auth`, `/api/me`)
- Listings/demo listings (`/api/listings`, `/api/demo/listings`)
- NDA and policy middleware (`/api/nda`, middleware)
- Watchlist/inquiries/seller workflows (`/api/watchlist`, `/api/inquiries`, `/api/seller`)
- Admin control center (`/api/admin/*`)
- Scraper entrypoint (`/api/scrape/ironplanet`)
- Billing (`/api/billing/*`, feature-flagged)

## Frontend route areas (`apps/web`)

- Public/marketing + app shell
- Auth + NDA flows
- Buyer/seller workspace routes under `/app/*`
- Admin workspace under `/admin/*` (legacy `/app/admin/*` redirects retained)

## Monorepo invariants

- Treat `packages/shared` as a strict package boundary.
- Import shared code through `@easyfinderai/shared` only.
- Do not deep-import `packages/shared/src/*` across workspace apps.

## Build/runtime invariants

- Keep builds deterministic; build shared artifacts before dependent apps.
- API runtime entry remains `node dist/index.js`.
- API service binds to port `8080`.
- Health endpoint must remain available.

## Contract synchronization rule

When API contract changes:

1. Update `openapi.yml`.
2. Run `pnpm -w openapi:types`.
3. Commit `apps/web/src/generated/openapi.ts` in the same PR.
