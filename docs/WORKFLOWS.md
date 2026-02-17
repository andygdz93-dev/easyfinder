# EasyFinder Workflows

Canonical engineering workflow document for delivery, validation, and operational write-policy behavior.

## CI and local verification gates

Run the required workspace checks before merge:

- `pnpm -w typecheck`
- `pnpm -w build`
- `pnpm -w lint`
- `pnpm -w test`

If API contract changes, also run:

- `pnpm -w openapi:types`

## PR and branch policy

- Workflow is PR-only to `app` (branch -> push -> PR -> merge).
- Do not bypass PR review with direct pushes to `app`.

## API contract workflow

`openapi.yml` is the source of truth for API contracts.

When contracts change:

1. Update `openapi.yml`.
2. Regenerate frontend types with `pnpm -w openapi:types`.
3. Commit `apps/web/src/generated/openapi.ts` in the same PR.

## Scraper flow and guardrails

### Public/admin scrape routes

- Public route: `GET /api/scrape/ironplanet?url=...`
  - URL validation failure: `400 INVALID_URL`
  - Scrape exception: `500 SCRAPE_FAILED`
  - Protected by write-disable middleware in demo mode
- Admin route: `POST /api/admin/scrape/ironplanet`
  - Requires admin authentication
  - Uses the same URL validation behavior

### `DEMO_MODE` write policy

When `DEMO_MODE=true`, guarded write paths return `403 DEMO_WRITE_DISABLED` (including scrape entrypoints that persist listings).

### Runtime constraints

- Search page timeout: 15s
- Detail page timeout: 15s
- Concurrency: 3 parallel detail fetches
- Maximum processed listings per request: 25

### Image extraction and normalization

- Scraper reads `<img src|data-src>` and normalizes to absolute URLs.
- Obvious non-listing assets are filtered (`icon`, `logo`, `pixel`, `placeholder`, `sprite`, `blank` patterns).
- Up to 5 images are persisted.
- If no valid images remain, a fallback placeholder image URL is used.
