**🧮 SCORING_MODEL.md — EasyFinder Ranking & Recommendation System**

Why the scoring model matters 

EasyFinder is not a listings site — it’s a decision engine.  

The scoring model is the product: 

It determines what buyers see first 

It defines “best deal” objectively 

It creates trust through explanations 

It becomes the moat (because competitors can’t easily replicate your judgment + data + outcomes) 

This document defines: 

What we score 

How we score it 

How we explain it 

How we improve it over time without breaking trust 

 

1) Product goals the scoring model must satisfy 

Buyer goals (primary) 

Best value (price vs condition/usage) 

Low risk (operable, documented, reputable source) 

Speed (instant short-list) 

Explainable (buyer understands why option #1 is #1) 

Seller goals (secondary) 

Fair opportunity to rank higher by: 

better price 

better documentation 

better condition 

transparency 

Platform goals 

Rankings must be: 

deterministic 

auditable 

robust to spam 

hard to game 

Monetization must not corrupt rankings. 

 

2) Scoring philosophy 

EasyFinder produces: 

A total score (0–100) 

Component scores (price/hours/location/condition/risk) 

An explanation string (rationale) 

Confidence score (how reliable the input data is) 

We never claim “best machine” universally. We claim: 

“Best option for your criteria based on available data.” 

 

3) Data model assumptions 

A listing has (minimum viable fields): 

price (numeric) 

hours (numeric) 

state / location 

is_operable (boolean) 

category (excavator, dozer, telehandler, etc.) 

source (marketplace / partner) 

createdAt / lastSeen 

optional: year, make, model, serial, attachments, service_history, inspection, photos, seller_type 

 

4) Score components (v1) 

 

4.1 Hard filters (gates) 

Some criteria should be treated as gates (not weighted). Example defaults: 

If is_operable = false → score = 0 (or exclude) 

If missing both price and hours → confidence drops sharply (can still show, but penalized) 

4.2 Weighted components (0–100 each) 

A) Price Score (0–100) Lower is better, but must be normalized. We normalize using category-based price caps. 

Recommended approach: 

Maintain per-category price_p50, price_p90 (rolling stats) 

Price score based on where listing price sits in distribution: 

Example: 

price <= p50 → high score 

price between p50–p90 → mid score 

price > p90 → low score 

Fallback if no stats: 

Use configured maxPrice for the category. 

B) Hours Score (0–100) Lower hours generally better, but depends on category. Same approach as price: 

per-category hours_p50, hours_p90 

fallback maxHours 

C) Location / Preference Score (0–100) 

Buyer preferences (preferred states) add value by reducing friction. 

Also consider distance later (zip → zip). 

v1: 

preferred state → 100 

non-preferred → 50 (not zero; still viable) 

D) Condition / Risk Score (0–100) v1 is simple: 

operable already gated 

add bonuses for documentation: 

documented service history 

inspection report 

verified seller / partner 

number of photos 

Risk penalties: 

missing hours/price 

inconsistent fields 

stale listing (not updated recently) 

“unknown” seller 

 

5) Total Score (v1 formula) 

Total score is weighted sum: 

total = w_price * priceScore 

 + w_hours * hoursScore 

 + w_location * locationScore 

 + w_risk * riskScore 

 

Default weights (tuneable): 

price: 0.35 

hours: 0.35 

location: 0.20 

risk: 0.10 

(Your current config looks close to this.) 

 

6) Explainability (non-negotiable) 

Every ranked item returns: 

component scores 

short rationale 

Example rationale template: 

“Operable equipment prioritized.” 

“Price score 82 based on price vs category benchmark.” 

“Hours score 69 based on hours vs category benchmark.” 

“Preferred state boost for CA.” 

“Documentation bonus applied (service history).” 

“Data confidence reduced due to missing hours.” 

This rationale is a moat: 

it builds trust 

it prevents “black box” suspicion 

it helps sellers improve listings 

 

7) Confidence Score (v1) 

Separate from total score. Confidence answers: “How reliable is this ranking?” 

Example: Start at 100 then subtract: 

missing price: -30 

missing hours: -25 

unknown seller: -10 

stale listing: -10 

inconsistent fields: -15 

Display: 

“High confidence” 

“Medium confidence” 

“Low confidence” 

This prevents bad data from dominating rankings. 

 

8) Personalization (v2) 

Once buyer profiles exist, scoring becomes personalized: 

Budget constraints (hard cap vs soft preference) 

Distance / shipping 

Category-specific needs 

Urgency (speed of delivery) 

Risk tolerance 

We still maintain explainability. 

 

9) Anti-gaming rules (moat protection) 

To prevent manipulation: 

No paid ranking 

Partner boosts must be explicit (“Promoted”) and NOT change score 

Penalize: 

unrealistic price 

repeated listing duplicates 

missing critical data 

Prefer verified sources and documented listings (risk score) 

 

10) Iteration plan 

v1 (Now) 

Weighted scores: price/hours/state/risk 

Confidence score 

Explanations 

v2 

Category benchmarks from real market data (p50/p90) 

Distance score 

Seller verification score 

Time-to-sell signals (later) 

v3 

Outcome learning: 

what got clicked 

what got contacted 

what converted (commission success) 

Build “market price” estimate (like Kelley Blue Book for equipment) 

 

11) Definition of “Best Option” 

EasyFinder’s “Best Option” label requires: 

total score in top tier 

confidence above threshold 

no red flags (operability, obviously) 

This protects trust. 

 
