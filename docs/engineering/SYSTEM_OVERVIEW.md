# EasyFinder Engineering System Overview

This is the canonical engineering overview for architecture, API posture, frontend contract, admin operations, and billing/webhook notes.

## Monorepo architecture

- `apps/api`: Fastify API + auth/entitlements + ingestion + billing integration points.
- `apps/web`: Vite/React client consuming API via a normalized base-URL contract.
- `packages/shared`: shared domain types/scoring primitives used by API and web.

## API source of truth

`openapi.yml` is the canonical contract for:

- endpoint paths and methods
- auth requirements
- request/response schema shape
- status codes and error envelope semantics

If an endpoint table in docs differs from `openapi.yml`, treat OpenAPI as authoritative.

## Endpoint status map (implemented vs flagged vs planned)

| Area | Status | Notes |
|---|---|---|
| Health (`/api/health`) | Implemented | Returns `ok`, `demoMode`, `billingEnabled`. |
| Demo listings (`/api/demo/listings*`) | Implemented | Public demo inventory surface. |
| Live listings (`/api/listings*`) | Implemented | Read paths gated by auth/NDA/plan semantics from middleware. |
| Scoring configs (`/api/scoring-configs`) | Implemented | `GET` + controlled `POST` replacement flow. |
| Watchlist (`/api/watchlist*`) | Implemented | Entitlement-gated and capped by plan rules. |
| Auth (`/api/auth/*`) | Implemented | Register/login/password-reset/session routes. |
| Admin sources (`/api/admin/*`) | Implemented | Source listing/sync/ingest paths available behind auth + role/plan checks. |
| Seller (`/api/seller/*`) | Implemented | Inquiries/insights/import/upload flows with policy gating. |
| NDA (`/api/nda/*`) | Implemented | NDA acceptance + status lifecycle. |
| Scraper (`/api/scrape/ironplanet`) | Implemented, behind write policy | Writes blocked while `DEMO_MODE=true`. |
| Billing (`/api/billing/*`) | Behind flag | Routes are registered for real billing only when `BILLING_ENABLED=true`. |
| Listing writes (`POST/PUT/DELETE /api/listings`) | Planned/placeholder | In OpenAPI with non-implemented responses today. |
| Offers (`/api/offers`) | Planned/placeholder | Endpoint exists with not-implemented behavior. |

## Runtime/feature flags and policy gates

### `DEMO_MODE`

- Enables demo-first runtime posture.
- Blocks persistence mutations through write-guard middleware.
- Affects live listing availability behavior and write-capable routes.

### `BILLING_ENABLED`

- Controls whether Stripe-backed billing routes are active.
- When disabled, billing endpoints are absent or return policy-driven failures.

## Frontend base URL contract (single source)

Frontend resolves API origin from `VITE_API_BASE_URL` (or fallback `VITE_API_URL`).

**Recommended value:** host-only origin (e.g., `https://easyfinder.fly.dev`) without `/api`.

The web client normalizes both host-only and `/api`-suffixed values, but host-only keeps configuration consistent across environments.

## Admin operational scope

Admin capabilities currently focus on operational controls:

- ingestion source visibility/sync
- controlled ingest initiation
- platform operational management through role/plan gated routes

Non-negotiables:

- no hidden pay-to-rank mutation of relevance score
- preserve explainability and auditability

## Billing & operations: Stripe webhook notes

- Stripe webhook endpoint lives under billing routes.
- Signature verification depends on raw request body handling.
- Billing route availability is conditional on `BILLING_ENABLED=true`.
- Operationally, validate webhook secret/env wiring before enabling in production.

## Change-management rules for docs/API drift

1. Update `openapi.yml` whenever API behavior or schema changes.
2. Regenerate OpenAPI types for web (`pnpm -w openapi:types`) in the same change set.
3. Keep this file architectural and policy-focused; avoid duplicating full endpoint schema tables.
