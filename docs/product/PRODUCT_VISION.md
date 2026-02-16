# EasyFinder Product Vision

EasyFinder is building an explainable heavy-equipment discovery and matching platform for buyers, sellers, and enterprise operators. The goal is to reduce search friction, improve purchase confidence, and make listing quality visible.

## Product goals

1. **Buyer confidence:** rank options by value and fitness, not just recency.
2. **Seller outcomes:** provide clear exposure without opaque pay-to-rank behavior.
3. **Platform trust:** preserve explainability, auditability, and policy-enforced fairness.
4. **Data moat:** combine owned inventory, partner feeds, and performance learnings.

## Core product principles

- **Scoring over sorting:** ranking should reflect value and decision quality.
- **Explainability is mandatory:** users should see _why_ a listing ranks.
- **Configurable intelligence:** scoring behavior can evolve via controlled config.
- **No hidden boosts:** promotions must be labeled separately from relevance/score.

## Listings acquisition strategy (consolidated)

### Phase 1 (0–30 days): bootstrap inventory quickly

- Seller self-serve submissions.
- Dealer onboarding through low-friction feed formats (CSV, sheet, lightweight JSON).
- Partner/affiliate relationships for early traffic and attribution.

### Phase 2 (30–120 days): improve reliability and coverage

- Integrate stable partner feeds and marketplace programs where available.
- Add repeatable feed adapters for ingestion normalization.
- Expand dealer integrations via system exports and scheduled sync.

### Phase 3 (120+ days): build defensibility

- Increase owned and exclusive supply.
- Learn from engagement/outcome signals.
- Build category/model-level benchmarks and trust indicators.

## What is intentionally avoided

- Brittle scraping as the primary long-term supply strategy.
- Any approach that weakens legal reliability, explainability, or operational stability.

Scraping can support discovery/onboarding, but sustained supply should come from explicit feeds, partnerships, and direct seller contribution.

## Monetization direction

- Near-term: lead attribution and qualified-introduction workflows.
- Mid-term: subscription/entitlement tiers for advanced capabilities.
- Later-stage: optional transaction-layer expansion where trust and compliance are mature.

## Canonical references

- Scoring behavior and vocabulary: `docs/product/SCORING_MODEL.md`
- Engineering/runtime constraints: `docs/engineering/SYSTEM_OVERVIEW.md`
- API contract and endpoint schemas: `openapi.yml`
