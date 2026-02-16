# EasyFinder Architecture Map

High-level workspace map. Detailed runtime/policy behavior lives in `docs/engineering/SYSTEM_OVERVIEW.md`.

## Workspace projects

- `apps/api` — Fastify backend API.
- `apps/web` — React + Vite frontend.
- `packages/shared` — shared types/scoring logic.

## Important root files

- `openapi.yml` — canonical API contract.
- `package.json` — workspace scripts (`typecheck`, `build`, `lint`, `test`, `openapi:types`).
- `pnpm-workspace.yaml` — workspace package selection.
- `turbo.json` — task pipeline orchestration.
- `.github/workflows/ci.yml` — CI gates and OpenAPI generation check.

## API functional areas (apps/api)

- Auth/session and profile (`/api/auth`, `/api/me`)
- Listings/demo listings (`/api/listings`, `/api/demo/listings`)
- NDA and access policy (`/api/nda`, middleware)
- Watchlist/inquiries/seller flows (`/api/watchlist`, `/api/inquiries`, `/api/seller`)
- Admin control center (`/api/admin/*`)
- Scraper entrypoint (`/api/scrape/ironplanet`)
- Billing (`/api/billing/*`, feature-flagged)

## Frontend route areas (apps/web)

- Public/marketing + app shell
- Auth + NDA flows
- Buyer/seller workspace routes under `/app/*`
- Admin workspace under `/admin/*` (with `/app/admin/*` redirects retained)

## Contract synchronization rule

When API contract changes:

1. Update `openapi.yml`
2. Run `pnpm -w openapi:types`
3. Commit generated `apps/web/src/generated/openapi.ts`
