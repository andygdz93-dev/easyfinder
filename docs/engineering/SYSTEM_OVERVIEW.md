# EasyFinder Engineering System Overview

Canonical engineering summary for runtime behavior, policy gates, and operations. For endpoint/schema truth, always use `openapi.yml`.

## Monorepo services

- `apps/api`: Fastify API + auth + NDA + listing/seller/admin routes + billing + scraper orchestration.
- `apps/web`: Vite/React client with app routes and dedicated admin surfaces.
- `packages/shared`: shared domain/scoring contracts.

## Admin Control Center (current behavior)

### Feature flags and policy gates

- `ADMIN_ENABLED` (default `true`): when `false`, admin endpoints return `404 ADMIN_DISABLED`.
- `ADMIN_EMAIL_ALLOWLIST` (optional comma-separated emails): additional allowlist enforcement on top of role.
- Admin API routes are protected by `app.authenticate` + `requireAdmin`.
- NDA middleware (`requireNDA`) explicitly bypasses NDA requirement for admins.

### Main admin API endpoints

Under `/api/admin`:

- `GET /overview`
- `GET /listings`
- `GET /listings/:id`
- `PATCH /listings/:id`
- `DELETE /listings/:id`
- `GET /inquiries`
- `PATCH /inquiries/:id`
- `GET /scoring-config`
- `POST /scoring-config`
- `GET /audit`
- `POST /scrape/ironplanet`

See `openapi.yml` for request/response shapes.

### Main admin UI routes

- `/admin/home`
- `/admin/listings`
- `/admin/listings/:id`
- `/admin/inquiries`
- `/admin/audit`

Legacy bridge routes remain under `/app/admin/*` and redirect into the canonical `/admin/*` surfaces.

## IronPlanet scraper behavior

### Public/admin route behavior

- Public scrape route: `GET /api/scrape/ironplanet?url=...`
  - URL validation failure: `400 INVALID_URL`
  - Scrape exception: `500 SCRAPE_FAILED`
  - Protected by `disableWritesInDemo` middleware
- Admin scrape route: `POST /api/admin/scrape/ironplanet`
  - Requires admin auth
  - Uses same URL validation

### DEMO_MODE write policy

When `DEMO_MODE=true`, write-block middleware returns `403 DEMO_WRITE_DISABLED` for guarded mutation paths (including scrape entrypoints that persist listings).

### Scraper runtime constraints

- Search page timeout: 15s
- Detail page timeout: 15s
- Concurrency: 3 parallel detail fetches
- Max processed listings per request: 25

### Image filtering/normalization rules

- Scraper extracts `<img src|data-src>` URLs and normalizes to absolute URLs.
- Filters out obvious non-listing assets (e.g., icon/logo/pixel/placeholder/sprite/blank tokens).
- Stores up to 5 images; if no valid image remains, uses fallback placeholder image URL.

## Scoring implementation posture

See `docs/product/SCORING_MODEL.md` for full product semantics.

Current implementation direction:

- `speed` is a first-class scoring pillar alongside `deal`, `usage`, and `risk`.
- Composite total currently starts from equal-weight pillar blending (25/25/25/25).
- Existing config schema still carries legacy weights (`price/hours/year/location/condition/completeness`); schema expansion/alignment is planned.
- Explainability is required: reasons, confidence, and disqualification semantics must remain user-visible/auditable.

## CI + verification rules

Required workspace checks before merge:

- `pnpm -w typecheck`
- `pnpm -w build`
- `pnpm -w lint`
- `pnpm -w test`

OpenAPI discipline:

1. Update `openapi.yml` when contract changes.
2. Run `pnpm -w openapi:types`.
3. Commit `apps/web/src/generated/openapi.ts` in the same PR.

Git policy: PR-only workflow to `app` (branch -> push -> PR -> merge; no direct push).
