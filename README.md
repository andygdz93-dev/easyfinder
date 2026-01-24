🚜 EasyFinder
Intelligent Equipment Discovery & Scoring Platform

Find the best heavy equipment — faster, smarter, and without middlemen.

🌍 What Is EasyFinder?

EasyFinder is a full-stack platform designed to help buyers and sellers of heavy-duty equipment (construction, industrial, agricultural) connect efficiently.

Instead of bouncing between dealers, auctions, and third-party marketplaces, EasyFinder provides a single destination where:

Buyers instantly discover the best equipment for their budget

Sellers list equipment and reach serious buyers faster

The platform intelligently scores and ranks listings

Every recommendation is explainable, transparent, and data-driven

🎯 Core Value Proposition
For Buyers

One place to search across inventory

Instant ranking of best options

Price vs condition vs usage scored automatically

No dealer pressure or auction friction

For Sellers

Faster exposure to qualified buyers

Intelligent positioning of listings

Reduced time-to-sale

For the Platform

Commission-based transaction model

High-value equipment → meaningful margins

Scalable intelligence layer

🧠 What Makes EasyFinder Different?

✔ Scoring, not sorting
✔ Explainable rankings
✔ Config-driven intelligence
✔ Built for scale, not MVP hacks

EasyFinder doesn’t just list equipment — it tells you what’s worth buying and why.

🏗️ System Architecture (High Level)
User Browser
     │
     ▼
Frontend (Vercel / Vite + React)
     │
     ▼
Backend API (Fly.io / Fastify)
     │
     ▼
Scoring Engine + Database (MongoDB)

📁 Repository Structure
easyfinder/
├── apps/
│   ├── api/                # Backend API (Fastify + TypeScript)
│   │   ├── src/
│   │   │   ├── routes/     # API endpoints
│   │   │   ├── scoring/    # Scoring engine
│   │   │   ├── services/  # Business logic
│   │   │   ├── plugins/   # Fastify plugins (JWT, auth)
│   │   │   └── index.ts   # API entry point
│   │   └── tests/
│   │
│   └── web/                # Frontend (Vite + React)
│       ├── src/
│       └── dist/
│
├── packages/
│   └── shared/             # Shared types & utilities
│
├── .github/workflows/      # CI pipelines
├── Dockerfile              # API container
├── fly.toml                # Fly.io config
├── pnpm-workspace.yaml
└── README.md

⚙️ Tech Stack
Backend

Node.js

Fastify

TypeScript

JWT Authentication

MongoDB

Docker

Fly.io

Frontend

React

Vite

TypeScript

Vercel

Tooling

pnpm workspaces

ESLint

TypeScript strict mode

GitHub Actions (CI)

🔌 Live Endpoints (Current)
Health
GET /api/health


✔ API up
✔ Database connected

Listings (Core Feature)
GET /api/listings


Returns:

Equipment listings

Total score

Score breakdown

Human-readable rationale

Scoring Configuration
GET /api/scoring-configs


Shows:

Active weights

Preferred states

Price & hour thresholds

Watchlist
GET /api/watchlist


(Currently stubbed for future expansion)

🧮 Scoring Engine

The scoring engine is the heart of EasyFinder.

What It Does

Evaluates each listing

Applies configurable weights

Produces:

totalScore

Component scores

Clear explanations

Why It Matters

No black boxes

Buyers understand recommendations

Admins can tune behavior without redeploying code

🔐 Authentication (Planned, Partially Wired)

Role system exists:

demo

buyer

seller

admin

JWT infrastructure is in place.
Routes will be enabled after product vision is finalized.

🚀 Deployment
Backend (Fly.io)

Dockerized

Internal port: 8080

HTTPS via Fly proxy

Environment secrets managed via Fly

Frontend (Vercel)

Root directory: apps/web

Build output: dist

Environment variable:

VITE_API_BASE_URL=https://easyfinder.fly.dev

🧪 CI / Quality Gates

CI runs on every PR and main branch push.

Checks include:

Linting

Type checking

Build validation

The goal: keep the codebase clean and predictable.

📌 Current Project Status

✅ Backend live
✅ Frontend live
✅ Scoring engine operational
✅ CI configured
⚠️ Auth & transactions intentionally deferred

This is a stable foundation, not a prototype.

🛣️ Roadmap (High Level)

Phase 1 — Vision Lock

Finalize buyer/seller flows

Define commission model

Lock scoring philosophy

Phase 2 — Core Expansion

Seller onboarding

Auth flows

Admin dashboards

Phase 3 — Intelligence

Smarter scoring

Market trend analysis

Deal recommendations

📄 Documentation Index

README.md → This file

PRODUCT_VISION.md → Product direction & goals

SYSTEM_OVERVIEW.md → Architecture & internals

(Planned) SCORING_MODEL.md

(Planned) API_REFERENCE.md

🤝 Contribution Philosophy

Clean code > fast hacks

Explainability > cleverness

Architecture before scale

No noise, no bloat

🧠 Final Note

EasyFinder is built to become the intelligent layer between buyers, sellers, and the heavy-equipment market.

Not a listing site.
Not an auction clone.
A decision engine.