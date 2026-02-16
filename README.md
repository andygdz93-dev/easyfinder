# EasyFinder

Intelligent equipment discovery and scoring in a pnpm monorepo.

## What this repo contains

- **`apps/api`**: Fastify API for listings, auth, scoring config, seller/admin workflows, and billing gates.
- **`apps/web`**: Vite + React frontend.
- **`packages/shared`**: shared domain types/utilities consumed by API and web.

## Documentation Index

- Product vision + acquisition strategy: `docs/product/PRODUCT_VISION.md`
- Scoring model semantics: `docs/product/SCORING_MODEL.md`
- Engineering/system overview (including admin, frontend contract, billing/webhook notes): `docs/engineering/SYSTEM_OVERVIEW.md`
- AI/dev invariants only: `docs/engineering/AI_DEV_CONTEXT.md`
- API contract (canonical): `openapi.yml`

## Local development

### Prerequisites

- Node.js 20.x
- pnpm 9.6.0+

### Environment setup

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Notes:
- `apps/api/.env` must be configured with required backend secrets/settings.
- `apps/web/.env` should set `VITE_API_BASE_URL`.

### Frontend API base URL contract

Use host-only API origin without `/api`:

- Local: `VITE_API_BASE_URL=http://127.0.0.1:8080`
- Production example: `VITE_API_BASE_URL=https://easyfinder.fly.dev`

The web client normalizes paths and adds `/api` as needed.

### Install, run, verify

```bash
pnpm install
pnpm dev
```

Common verification:

```bash
pnpm -w lint
pnpm -w typecheck
pnpm -w test
pnpm -w build
```

## OpenAPI workflow

`openapi.yml` is the single API source of truth.

When API contract changes:

1. Update `openapi.yml`.
2. Regenerate web types:
   ```bash
   pnpm -w openapi:types
   ```
3. Commit the generated file changes together.

## Safety checklist before merge/deploy

- Import shared modules only through `@easyfinderai/shared` (no deep imports from `packages/shared/src`).
- Keep Docker build sequence deterministic (shared build before dependent app builds).
- Preserve Fly runtime assumptions unless intentionally changing infra:
  - API port `8080`
  - health endpoint available
  - runtime entry `node dist/index.js`
- Run full workspace gates:
  - `pnpm -w lint`
  - `pnpm -w typecheck`
  - `pnpm -w test`
  - `pnpm -w build`

## Admin bootstrap / promote flow

To safely promote an existing user to `admin` without editing Mongo manually, run the API helper with `MONGO_URL` and `DB_NAME` set in `apps/api/.env`: `pnpm --filter @easyfinderai/api promote-admin -- --email fernandogarciarodriguez78@gmail.com`; in production it is blocked unless you intentionally pass `--allow-production` (`pnpm --filter @easyfinderai/api promote-admin -- --email fernandogarciarodriguez78@gmail.com --allow-production`), and the command prints email searched, user id, previous role → new role, and a final `DONE`/`NOOP` status.
