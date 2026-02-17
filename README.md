# EasyFinder

Intelligent heavy-equipment discovery and scoring in a pnpm monorepo.

## Repository layout

- `apps/api` — Fastify API (auth, listings, NDA, seller/admin workflows, billing, scraping entrypoints).
- `apps/web` — Vite + React frontend.
- `packages/shared` — shared types and scoring logic used by API and web.

## Canonical docs

Canonical docs in `/docs` (only these files):

- `docs/ARCHITECTURE.md`
- `docs/WORKFLOWS.md`
- `docs/ADMIN.md`
- `docs/SCORING.md`
- Optional compatibility pointer: `docs/ARCHITECTURE_MAP.md`
- API contract (source of truth): `openapi.yml`

## Docs locations

- Snapshots: `ops/snapshots/`
- Archived docs: `archive/docs/`
- Product docs: `product/docs/`

## Docs policy

- The 4 canonical docs in `/docs` are the maintained source of truth.
- `ops/snapshots/` contains generated snapshot artifacts and is not canonical; do not hand-edit these files.
- `archive/docs/` is historical reference and is not actively maintained.
- `product/docs/` contains product documentation and is not canonical.
- `project docs/` is deprecated and will be removed in a later cleanup.

## Prerequisites

- Node.js 20.x
- pnpm 9.6.0+

## Environment setup (PowerShell)

```powershell
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env
```

Set `VITE_API_BASE_URL` to the API origin **without** `/api`.

Examples:

- Local: `http://127.0.0.1:8080`
- Production: `https://easyfinder.fly.dev`

## Install and run

```powershell
pnpm install
pnpm dev
```

## Local verification

Run the same workspace checks expected in CI:

```powershell
pnpm -w typecheck
pnpm -w build
pnpm -w lint
pnpm -w test
```

## API route existence quick-check

Before debugging frontend submit issues, verify the deployed API has seller routes:

```bash
curl -i https://<API_BASE>/api/health
curl -i -X POST https://<API_BASE>/api/seller/listings \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <TOKEN>' \
  --data '{"title":"Route check","description":"Route check","location":"Austin, TX"}'
```

If `/api/health` works but `/api/seller/listings` returns 404, the deployed backend is missing seller route registration/version.

## OpenAPI workflow

`openapi.yml` is the canonical contract.

When API contract changes:

1. Update `openapi.yml`.
2. Regenerate frontend types:
   ```powershell
   pnpm -w openapi:types
   ```
3. Commit `apps/web/src/generated/openapi.ts` in the same PR.

## Git workflow (PR-only)

Changes must go through a Pull Request. Do **not** push direct commits to the `app` branch.

Recommended flow:

1. Create a branch from latest `app`.
2. Commit your work on that branch.
3. Push the branch to origin.
4. Open a PR into `app`.
5. Merge after review + required checks.

## Admin bootstrap / promotion

Use the API helper to promote an existing user to `admin`:

```powershell
pnpm --filter @easyfinderai/api promote-admin -- --email fernandogarciarodriguez78@gmail.com
pnpm --filter @easyfinderai/api promote-admin -- --email andygdz653@gmail.com
```

Important notes:

- `promote-admin` only works for users that already exist in the database.
- In production, add `--allow-production` intentionally:
  ```powershell
  pnpm --filter @easyfinderai/api promote-admin -- --email fernandogarciarodriguez78@gmail.com --allow-production
  ```

