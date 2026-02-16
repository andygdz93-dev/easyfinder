# AI Development Context (Invariants Only)

This file is intentionally minimal and operational.

## Monorepo invariants

- Treat `packages/shared` as a package boundary.
- Import shared code via `@easyfinderai/shared` only.
- Do **not** deep-import from `packages/shared/src/*` across workspace apps.

## Build/runtime invariants

- Keep builds deterministic; build shared package artifacts before dependent apps.
- API runtime entry remains `node dist/index.js`.
- API service binds to port `8080`.
- Health endpoint must stay available.

## Verification gates

Run these before handoff:

- `pnpm -w typecheck`
- `pnpm -w build`
- `pnpm -w lint`
- `pnpm -w test`

If API contract changes, also run:

- `pnpm -w openapi:types`

## Delivery policy

- PR-only workflow to `app` (branch -> push -> PR -> merge).
- Do not bypass PR review by pushing direct commits to `app`.

## Canonical references

- System/runtime behavior: `docs/engineering/SYSTEM_OVERVIEW.md`
- Product direction: `docs/product/PRODUCT_VISION.md`
- Scoring semantics: `docs/product/SCORING_MODEL.md`
- API contract: `openapi.yml`
