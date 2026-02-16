# Scoring Model (Product-Level)

This document describes the ranking intent and human-readable scoring semantics. For request/response schema truth, use `openapi.yml`.

## Scope

EasyFinder ranking evaluates listing quality and fit using the API-exposed scoring object:

- `totalScore`
- `score.total`
- `score.breakdown.{price,hours,year,location,condition,completeness}`
- `score.reasons[]`
- `score.confidence`
- `score.disqualified`

These field names intentionally mirror the current `Listing` schema in OpenAPI.

## Inputs considered

- Price
- Usage hours
- Year
- Location fit
- Condition
- Data completeness
- Operability state (policy-sensitive)

## Output semantics

- **`totalScore` / `score.total`**: composite score used for ordering.
- **`score.breakdown.*`**: per-factor contributions for explainability.
- **`score.reasons`**: concise rationale strings shown in UI.
- **`score.confidence`**: confidence indicator based on signal quality/completeness.
- **`score.disqualified`**: listing should not be treated as competitive for recommendation purposes.

## Product guardrails

- Ranking logic must remain explainable to end users.
- Promotions/paid placement are never merged into relevance score; they must be visually and semantically separated.
- Scoring configuration changes should be auditable and reversible.

## Config control

Active scoring configuration is exposed via `/api/scoring-configs` (see OpenAPI schema `ScoringConfigInput`).

Primary configuration groups:

- `weights` for each breakdown axis
- `preferredStates`
- numeric bounds (`min/max` for price, hours, year, condition)

## Known evolution area

As ranking evolves, this product doc should stay aligned with API response fields in `openapi.yml`. If new score axes are added, update both OpenAPI and this document in the same change.
