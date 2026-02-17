# Docs index

Use this index to find maintained documentation and generated artifacts.

## Canonical docs

- Repository overview: [`README.md`](../README.md)
- Architecture: [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md)
- Workflows: [`docs/WORKFLOWS.md`](./WORKFLOWS.md)
- Admin operations: [`docs/ADMIN.md`](./ADMIN.md)
- Scoring model: [`docs/SCORING.md`](./SCORING.md)

## Docs policy

- Canonical docs are `README.md`, `docs/ARCHITECTURE.md`, `docs/WORKFLOWS.md`, `docs/ADMIN.md`, and `docs/SCORING.md`.
- `docs/_generated/*` contains auto-generated artifacts and is not canonical.
- `docs/archive/*` and `project docs/*` are deprecated/historical and are not canonical.
- OpenAPI contract source of truth is `openapi.yml`; generated client types live at `apps/web/src/generated/openapi.ts`.
