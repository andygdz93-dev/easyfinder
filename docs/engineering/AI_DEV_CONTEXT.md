# AI Development Context (Invariants Only)

This file is intentionally minimal. It captures engineering rules/invariants; product narrative and endpoint schema details live elsewhere.

## Monorepo invariants

- Treat `packages/shared` as a package boundary.
- Import shared code via `@easyfinderai/shared` only.
- Do **not** deep-import from `packages/shared/src/*` across workspace apps.

## Docker determinism principles

- Keep container builds deterministic and dependency-driven.
- Build shared package artifacts before dependent app builds.
- Avoid hidden build-time side effects that depend on local state.

## Fly runtime assumptions

- API process runs `node dist/index.js`.
- Service binds to port `8080`.
- Health endpoint remains available for runtime checks.

## Definition of Done checks

Run workspace gates before handoff:

- `pnpm -w lint`
- `pnpm -w typecheck`
- `pnpm -w test`
- `pnpm -w build`

## Canonical references

- Product direction: `docs/product/PRODUCT_VISION.md`
- Scoring semantics: `docs/product/SCORING_MODEL.md`
- Engineering/API overview: `docs/engineering/SYSTEM_OVERVIEW.md`
- API contract: `openapi.yml`
