# Scoring Model (Product-Level)

This document defines current scoring semantics and near-term direction. For API schema truth, use `openapi.yml`.

## Current scoring pillars

EasyFinder treats these as first-class pillars:

- `deal`
- `usage`
- `risk`
- `speed`

`speed` is now part of the same explainable surface as the other pillars (not a hidden tiebreaker).

## Current output semantics

The score payload supports:

- `total`
- `breakdown.{deal,usage,risk,speed}`
- `scoreV2.{deal,usage,risk,speed}`
- `reasons[]` (human-readable explainability)
- `flags[]`
- `confidence` and `confidenceScore`
- `bestOptionEligible`
- `disqualified`

## Weighting posture today

- Composite score currently starts from equal-weight blending across pillars (25% each).
- This equal baseline is intentional while the new pillar model stabilizes.

## Schema evolution (planned)

The scoring config contract still includes legacy weight keys (`price/hours/year/location/condition/completeness`).

Direction:

- Align config schema with pillar-based scoring.
- Keep migrations explicit and backwards-safe.
- Update OpenAPI + generated types in the same PR whenever schema changes.

## Explainability requirements (non-negotiable)

- Every ranking output must be explainable to end users.
- Paid placement/promotion cannot be merged into relevance score.
- Score changes must remain auditable and reversible.

## References

- Runtime/ops context: `docs/engineering/SYSTEM_OVERVIEW.md`
- API schema: `openapi.yml`
