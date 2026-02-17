# EasyFinder Scoring

Canonical scoring semantics and implementation posture. For API schema truth, use `openapi.yml`.

## Scoring pillars

EasyFinder treats these pillars as first-class:

- `deal`
- `usage`
- `risk`
- `speed`

`speed` is part of the same explainable surface as other pillars (not a hidden tiebreaker).

## Output semantics

Score payload supports:

- `total`
- `breakdown.{deal,usage,risk,speed}`
- `scoreV2.{deal,usage,risk,speed}`
- `reasons[]` (human-readable explainability)
- `flags[]`
- `confidence` and `confidenceScore`
- `bestOptionEligible`
- `disqualified`

## Weighting posture

- Composite score currently starts from equal-weight blending across pillars (25% each).
- The equal baseline is intentional while the pillar model stabilizes.

## Config/schema alignment direction

Current scoring config still includes legacy keys (`price/hours/year/location/condition/completeness`).

Direction:

- Align config schema with pillar-based scoring.
- Keep migrations explicit and backwards-safe.
- Update OpenAPI and generated types in the same PR when schema changes.

## Explainability requirements

- Every ranking output must remain explainable to end users.
- Paid placement/promotion must not be merged into relevance score.
- Score changes must remain auditable and reversible.
