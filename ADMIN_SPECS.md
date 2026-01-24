Admin Specs (what Admin is, what it controls)
Admin mission

Admin exists to:

keep inventory clean and current

manage ingestion sources and feeds

tune scoring config safely

moderate sellers/listings

observe platform health

Admin roles

admin role required (JWT)

Admin endpoints return:

401 if missing token

403 if wrong role

Admin capabilities (phased)
Phase A — Operational admin (first)

Endpoints

GET /api/admin/overview

counts: listings, sources, sellers, errors

GET /api/admin/ingestion/sources

list sources and their sync status

POST /api/admin/ingestion/sources

add source (manual for now)

POST /api/admin/ingestion/sources/:id/sync

trigger sync (manual)

PUT /api/admin/scoring-configs

update scoring weights, preferred states, caps, penalty values

GET /api/admin/scoring-configs/history

audit trail

Non-negotiable admin policies

Cannot create “pay-to-rank”

Must label promotions separately from score

Must preserve explainability

Phase B — Moderation admin (next)

GET /api/admin/listings?status=pending|flagged

PUT /api/admin/listings/:id/status

PUT /api/admin/listings/:id/flags

Listing statuses

pending_review

active

paused

removed

Phase C — Monetization admin (later)

commission tracking

lead attribution

seller plans / boosts (explicitly labeled)

3) Frontend Contract (how the web app talks to the API)

This is the agreement between apps/web and apps/api.

Environment

Frontend reads:

VITE_API_BASE_URL=https://easyfinder.fly.dev/api

So:

Health → ${BASE}/health

Listings → ${BASE}/listings

Client responsibilities

Frontend must:

treat backend as source of truth

display explainability

never “invent” ranking logic in UI

separate “promoted” from “best value” visuals

Core UI flows (v1)
Buyer flow

Pages

/ landing

/search (filters + listings)

/listing/:id (detail + rationale)

/watchlist (saved items)

API calls

GET /listings

GET /scoring-configs

GET /watchlist

Seller flow (v2)

/sell

/sell/new

/seller/dashboard

API calls

POST /seller/listings

GET /seller/listings

Auth flow (v2)

/login, /register

POST /auth/login

POST /auth/register

store JWT in memory/local storage (final decision later)

Response shaping rules (frontend)
Listing card needs:

title, price, hours, state, category, images[0]

totalScore

top 2 rationale items

flags (non-operable badge, low confidence badge)

Listing detail needs:

full score breakdown

full rationale

confidence indicator

Error handling contract

Frontend should interpret:

404 as “not found” (route or listing)

401 as “login required”

403 as “not authorized”

500 as “server error”
