# Easy Finder AI

## Quickstart (local)

```powershell
pnpm install
pnpm dev
Invoke-WebRequest http://localhost:8080/api/health -UseBasicParsing
```

## 1) Stack decision (short rationale table)

| Layer | Choice | Rationale |
| --- | --- | --- |
| Monorepo | pnpm workspaces + Turborepo | Fast local iteration, shared packages, and clean woation. |
| Fronterkspace orchestrnd | React + Vite + Tpment and modern DXypeScript + TailwindCSS | Rapid UI develo with a premium UI. |
| UI Kit | shadcn-inspired components | Lightweight, composable components compatible with Tailwind. |
| State/Data | TanStack Query | Handles caching, loading states, and request lifecycle. |
| Charts | Recharts | Lightweight, composable charts for score breakdown. |
| Backend | Fastify + TypeScript | High performance, typed server with plugin ecosystem. |
| Database | PostgreSQL (Neon target) | Relational model, search readiness, auditability. |
| ORM | Prisma (planned) | Clean schema-driven ORM (DB connection is optional for MVP demo data). |
| Auth | JWT + bcrypt | Simple stateless auth, secure password hashing. |
| Validation | Zod | Runtime validation for input safety. |
| Deploy | Vercel (web), Fly.io (api), Neon (db) | Fast deploys, scalable infra. |

## 2) Architecture overview (text diagram)

```

[Web - Vite/React] -> [API - Fastify] -> [Postgres/Neon]
         |                 |                  |
         |                 |-> [Scoring engine - shared]
         |                 |-> [Ingestion - CSV + Mock Feeds]
         |                 |-> [RBAC + Rate Limits]
         |-> [Recharts]
```

## Data model

- **User**: id, email, name, role, passwordHash
- **Listing**: id, title, description, price, hours, state, category, operable, source, createdAt
- **ScoringConfig**: id, userId, name, weights, preferredStates, thresholds, active
- **Watchlist**: userId, listingIds[]
- **SourceStatus**: name, status, lastSync

## API endpoints (roles + limits)

| Endpoint | Role | Notes |
| --- | --- | --- |
| GET /health | public | Returns db status + time. |
| POST /api/auth/register | public | Creates demo user. |
| POST /api/auth/login | public | Returns JWT. |
| GET /api/me | auth | Profile. |
| GET /api/listings | public | Demo limited to 20/day. |
| GET /api/listings/:id | public | Listing detail + score. |
| GET /api/scoring-configs | auth | Demo sees default only. |
| POST /api/scoring-configs | buyer+ | Create config. |
| PATCH /api/scoring-configs/:id | buyer+ | Update config. |
| POST /api/scoring-configs/:id/activate | buyer+ | Activate config. |
| GET /api/watchlist | buyer+ | View watchlist. |
| POST /api/watchlist/:listingId | buyer+ | Add listing. |
| DELETE /api/watchlist/:listingId | buyer+ | Remove listing. |
| GET /api/seller/insights | seller+ | Seller dashboard data. |
| POST /api/admin/ingest/csv | admin | CSV ingestion. |
| POST /api/admin/sources/sync | admin | Mock connector sync. |
| GET /api/admin/sources | admin | Connector health. |

Rate limits:
- Demo: 30 req/min
- Buyer: 120 req/min
- Seller/Admin: 240 req/min

## Repo structure
## 3) Data model (entities)

- User: id, email, name, role
- Listing: id, title, description, state, price, hours, operable, category, source, createdAt
- ScoringConfig: id, name, weights, preferredStates, maxHours, maxPrice, active, userId
- Watchlist: userId -> listingIds
- SourceHealth: source name, status, lastSync

## 4) API endpoint list with roles + limits

Base URL: `/api`

| Endpoint | Method | Role | Notes |
| --- | --- | --- | --- |
| `/health` | GET | public | Returns status + db flag. |
| `/auth/register` | POST | public | Register user (buyer by default). |
| `/auth/login` | POST | public | Login user. |
| `/me` | GET | auth | Current user profile. |
| `/listings` | GET | demo+ | Filters, sorting, pagination, score breakdown. Demo limit 20/day. |
| `/listings/:id` | GET | demo+ | Listing detail + score. |
| `/scoring-configs` | GET | demo+ | Demo sees default; buyer+ sees own configs. |
| `/scoring-configs` | POST | buyer+ | Create config. |
| `/scoring-configs/:id` | PATCH | buyer+ | Update config. |
| `/scoring-configs/:id/activate` | POST | buyer+ | Activate config. |
| `/watchlist` | GET | buyer+ | Watchlist listings. |
| `/watchlist/:listingId` | POST | buyer+ | Add to watchlist. |
| `/watchlist/:listingId` | DELETE | buyer+ | Remove from watchlist. |
| `/seller/insights` | GET | seller+ | Seller dashboard analytics. |
| `/admin/ingest/csv` | POST | admin | CSV ingestion. |
| `/admin/sources/sync` | POST | admin | Mock connector sync. |
| `/admin/sources` | GET | admin | Source health status. |

Rate limits (per minute):
- demo: 30 req/min + listings cap 20/day
- buyer: 120 req/min
- seller: 240 req/min

## 5) Repo scaffold (folder structure)

```
EasyfinderAI1.0/
  apps/
    web/
    api/
  packages/
    shared/
  scripts/
    setup.ps1
  .github/workflows/ci.yml
  README.md
  .gitignore
  pnpm-workspace.yaml
  turbo.json
```

## 6) Code files (runnable implementation)

- `apps/api`: Fastify server, RBAC, rate limiting, ingestion.
- `apps/web`: Vite React UI, modern dark UI, listing search, scoring and dashboards.
- `packages/shared`: shared types, scoring engine, demo data (`@easyfinderai/shared`).

## 7) Tests + CI workflow

- Backend tests: Vitest + Supertest (auth, RBAC, health, scoring engine).
- Frontend tests: Vitest + React Testing Library (landing, listings, env validation).
- GitHub Actions: lint, typecheck, tests.

## 8) Runbook: exact PowerShell commands + deploy notes

### Local dev

```powershell
pnpm install
pnpm dev
```

### Tests & quality

```powershell
pnpm lint
pnpm typecheck
pnpm test
```

### Proxy/registry access (when installs fail with 403)

If you are behind a corporate proxy or registry allowlist, configure npm/pnpm to use it:

```powershell
# Verify proxy-related env vars are present
Get-ChildItem Env: | Where-Object { $_.Name -match 'PROXY' }

# Configure npm/pnpm to use your proxy (replace placeholders)
npm config set proxy http://USER:PASS@PROXY_HOST:PORT
npm config set https-proxy http://USER:PASS@PROXY_HOST:PORT

# Optional: set a registry mirror if npmjs.org is blocked
npm config set registry https://registry.npmmirror.com/
pnpm config set registry https://registry.npmmirror.com/
```

If TLS inspection is enforced, ensure your proxy CA cert is trusted by Node (set `NODE_EXTRA_CA_CERTS`).

### Environment variables

#### API (`apps/api/.env`)

```
DATABASE_URL=postgresql://user:password@localhost:5432/easyfinder
JWT_SECRET=supersecret
CORS_ORIGINS=http://localhost:5173
```

#### Web (`apps/web/.env`)

```
VITE_API_URL=http://localhost:8080
```

### Demo users

| Role | Email | Password |
| --- | --- | --- |
| Demo | demo@easyfinder.ai | DemoPass123! |
| Buyer | buyer@easyfinder.ai | BuyerPass123! |
| Seller | seller@easyfinder.ai | SellerPass123! |
| Admin | admin@easyfinder.ai | AdminPass123! |

### Deploy notes

- Frontend: Vercel with `VITE_API_URL` pointing to Fly.io API.
- Backend: Fly.io with `JWT_SECRET`, `DATABASE_URL`, `CORS_ORIGINS`.
- Database: Neon Postgres.