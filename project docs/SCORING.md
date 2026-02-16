# EasyFinder Scoring (Canonical) — v2.0

> Canonical scoring specification for ranking listings in EasyFinder. This document reflects the current implementation in `packages/shared/src/scoring.ts`.

## Purpose

EasyFinder is a decision engine that ranks listings for **best value, fastest acquisition, and lowest risk**.

## Inputs

### Fields used today

- `price`
- `hours`
- `year` (or inferred from title when present)
- `title`
- `description`
- `state`
- `operable` / `is_operable`
- `sellerType` (`dealer | auction | private | unknown`)
- `shippingAvailable`
- `availability` (`in_stock | scheduled_auction | unknown`)
- `lastSeenAt` (fallback: `listingUpdatedAt`)
- `photoCount` (fallback: `images.length`)
- `verifiedSeller`
- `hasInspectionReport`
- `hasServiceHistory`
- `source`
- scoring config bounds (`min/max` price/hours/year and `preferredStates`)

### Optional future fields (supported as extensions)

- shipping ETA / delivery SLA
- seller response latency
- inspection freshness metadata
- location precision (city/zip distance)

## Outputs

- `totalScore` (`score.total`, 0–100)
- `breakdown` object with:
  - `deal`
  - `usage`
  - `risk`
  - `speed`
- `confidenceScore` (0–100)
- `reasons[]` structured as:
  - `{ kind: "deal"|"usage"|"risk"|"speed", message: string }`
- `flags[]`
- `bestOptionEligible`

## Pillars (v2)

### DealScore

Price versus usage pressure. Lower price relative to hours yields a higher score. Missing price/hours reduce deal certainty.

### UsageScore

Primarily derived from hours (lower hours score higher) with a mild model-year adjustment.

### RiskScore

Operability/trust/completeness/freshness driven:

- verified seller, inspection report, service history increase risk score
- missing key fields (price/hours/state), low photos, and staleness reduce risk score

### SpeedScore

First-class pillar incorporating:

- seller type signal (`dealer` faster, `auction` slower)
- shipping availability bonus
- preferred state logistics bias
- staleness responsiveness penalty
- availability timing signal (`in_stock` faster, `scheduled_auction` slower)

## Weights

Equal pillar weights:

- deal: `0.25`
- usage: `0.25`
- risk: `0.25`
- speed: `0.25`

`totalScore = clamp(0.25*deal + 0.25*usage + 0.25*risk + 0.25*speed, 0, 100)`

Quality/completeness does **not** directly rank listings. It influences confidence and eligibility.

## Eligibility rules

- Non-operable listings are never Best Option.
- Best Option gate:
  - `confidenceScore >= 60`
  - `risk >= 40`
  - `operable === true`

## Explainability rules

- Reasons are simple and concrete.
- Reasons are structured by pillar kind.
- The list is capped at 8 reasons.
- Scoring attempts to provide at least one reason per pillar when data is available.

## Defaults + fallbacks

- Missing fields are treated neutrally where possible (e.g., normalization fallback), but confidence is reduced.
- Missing price/hours/state and low/unknown evidence reduce confidence and may set flags.
- Common flags include:
  - `NON_OPERABLE`
  - `LOW_CONFIDENCE`
  - `STALE_LISTING`
  - `MISSING_PRICE`
  - `MISSING_HOURS`
  - `MISSING_STATE`
  - `NOT_BEST_OPTION_ELIGIBLE`

## Versioning

- Current canonical model: **v2.0**
- Previous model document archived at: `project docs/_archive/SCORING_MODEL.v1.md`
