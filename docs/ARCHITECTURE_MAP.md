# EasyFinder Monorepo Architecture Map

## Workspace overview

EasyFinder is a **pnpm + Turborepo monorepo** with three workspace projects:

- `apps/api` — Fastify backend API
- `apps/web` — React + Vite frontend
- `packages/shared` — shared TypeScript types/data/scoring

### Root layout confirmation

The repository root includes all required workspace and orchestration files:

- `apps/`
- `packages/`
- `pnpm-workspace.yaml`
- `turbo.json`
- `package.json`
- `openapi.yml`

## Full directory tree (depth 5)

Excluded: `node_modules`, `.turbo`, `dist`, `build`, `coverage`, `.git`.

```text
.
├── .dockerignore
├── .easyfinder-context.md
├── .gitattributes
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── lockfile-refresh.yml
├── .gitignore
├── .npmrc
├── .vscode/
│   └── settings.json
├── Dockerfile
├── README.md
├── apps/
│   ├── api/
│   │   ├── .env.example
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── audit.ts
│   │   │   ├── auth.ts
│   │   │   ├── bcryptjs.d.ts
│   │   │   ├── billing.ts
│   │   │   ├── config.ts
│   │   │   ├── db.ts
│   │   │   ├── email.ts
│   │   │   ├── entitlements.ts
│   │   │   ├── env.ts
│   │   │   ├── index.ts
│   │   │   ├── inquiries.ts
│   │   │   ├── lib/
│   │   │   │   └── audit.ts
│   │   │   ├── listings.ts
│   │   │   ├── middleware/
│   │   │   │   ├── disableWritesInDemo.ts
│   │   │   │   ├── requireNDA.ts
│   │   │   │   └── requirePlan.ts
│   │   │   ├── passwordResetTokens.ts
│   │   │   ├── response.ts
│   │   │   ├── routes/
│   │   │   │   ├── admin.ts
│   │   │   │   ├── auth.ts
│   │   │   │   ├── billing.ts
│   │   │   │   ├── demo-listings.ts
│   │   │   │   ├── health.ts
│   │   │   │   ├── inquiries.ts
│   │   │   │   ├── listings.ts
│   │   │   │   ├── me.ts
│   │   │   │   ├── nda.ts
│   │   │   │   ├── offers.ts
│   │   │   │   ├── scoring.ts
│   │   │   │   ├── scrapers.ironplanet.ts
│   │   │   │   ├── seller.ts
│   │   │   │   └── watchlist.ts
│   │   │   ├── scrapers/
│   │   │   │   ├── ironplanet.ts
│   │   │   │   └── ironplanet.validation.ts
│   │   │   ├── server.ts
│   │   │   ├── store.ts
│   │   │   ├── stripe.ts
│   │   │   ├── types.d.ts
│   │   │   └── users.ts
│   │   ├── tests/
│   │   │   ├── api.test.ts
│   │   │   ├── billing.test.ts
│   │   │   ├── disableWritesInDemo.test.ts
│   │   │   ├── ironplanet-scraper.test.ts
│   │   │   ├── me-billing.test.ts
│   │   │   ├── scoring.test.ts
│   │   │   └── seller-upload.test.ts
│   │   ├── tsconfig.json
│   │   ├── tsconfig.test.json
│   │   └── vitest.config.ts
│   └── web/
│       ├── .env.example
│       ├── index.html
│       ├── package.json
│       ├── postcss.config.js
│       ├── public/
│       │   └── demo-images/
│       │       ├── backhoe/
│       │       ├── dozer/
│       │       ├── excavator/
│       │       ├── other/
│       │       ├── skid-steer/
│       │       ├── telehandler/
│       │       └── wheel-loader/
│       ├── src/
│       │   ├── App.tsx
│       │   ├── components/
│       │   │   ├── AppShell.tsx
│       │   │   ├── DemoBanner.tsx
│       │   │   ├── DemoListingCard.tsx
│       │   │   ├── ErrorBoundary.tsx
│       │   │   ├── ImageGallery.tsx
│       │   │   ├── Layout.tsx
│       │   │   ├── RequireAuth.tsx
│       │   │   ├── RequireEnterprise.tsx
│       │   │   ├── RequireLiveNda.tsx
│       │   │   ├── RequireSellerUploadAccess.tsx
│       │   │   └── ui/
│       │   ├── env.ts
│       │   ├── generated/
│       │   │   └── openapi.ts
│       │   ├── index.css
│       │   ├── layouts/
│       │   │   ├── DemoLayout.tsx
│       │   │   ├── LiveLayout.tsx
│       │   │   └── ModeLayout.tsx
│       │   ├── lib/
│       │   │   ├── api.ts
│       │   │   ├── apiClient.ts
│       │   │   ├── auth.tsx
│       │   │   ├── billing.ts
│       │   │   ├── demoApi.ts
│       │   │   ├── demoWatchlist.ts
│       │   │   ├── formatters.ts
│       │   │   ├── nda.tsx
│       │   │   ├── runtime.tsx
│       │   │   └── sellerCapabilities.ts
│       │   ├── main.tsx
│       │   ├── pages/
│       │   │   ├── ForgotPassword.tsx
│       │   │   ├── Landing.tsx
│       │   │   ├── Login.tsx
│       │   │   ├── Register.tsx
│       │   │   ├── ResetPassword.tsx
│       │   │   ├── app/
│       │   │   └── demo/
│       │   └── vite-env.d.ts
│       ├── tailwind.config.js
│       ├── tests/
│       │   ├── api-env.test.ts
│       │   ├── app-shell.test.tsx
│       │   ├── auth-flow.test.tsx
│       │   ├── demo.test.tsx
│       │   ├── env.test.ts
│       │   ├── landing.test.tsx
│       │   ├── listing-detail.test.tsx
│       │   ├── listings.test.tsx
│       │   ├── require-live-nda.test.tsx
│       │   └── setup.ts
│       ├── tsconfig.json
│       ├── vercel.json
│       └── vite.config.ts
├── docs/
│   └── ARCHITECTURE_MAP.md
├── eslint.config.js
├── fly.toml
├── openapi.yml
├── package.json
├── packages/
│   └── shared/
│       ├── package.json
│       ├── src/
│       │   ├── data.ts
│       │   ├── demoImages.ts
│       │   ├── index.ts
│       │   ├── scoring.ts
│       │   └── types.ts
│       ├── tests/
│       │   └── scoring.test.ts
│       └── tsconfig.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── project docs/
│   ├── ADDENDUM_LISTINGS_STRATEGY.md
│   ├── ADMIN_SPECS.md
│   ├── API_REFERENCE.md
│   ├── EasyFinder_Product_Vision.md
│   ├── EasyFinder_System_Overview.md
│   ├── FRONTEND_CONTRACT.md
│   ├── SCORING_MODEL.md
│   └── STRIPE_WEBHOOK_VERIFICATION.md
├── scripts/
│   ├── clean.ps1
│   ├── cors-smoke-test.sh
│   └── setup.ps1
├── turbo.json
└── vercel.json
```

## Workspace package inventory

### `apps/api`

- **Package:** `@easyfinderai/api`
- **Scripts:**
  - `dev`: build shared, then watch `src/index.ts`
  - `build`: TypeScript compile
  - `lint`, `typecheck`, `test`
- **Entrypoints:**
  - Runtime bootstrap: `src/index.ts`
  - Server composition: `src/server.ts`
  - Build output main: `dist/index.js` (`main` field)
- **Top-level `src` folders:** `lib/`, `middleware/`, `routes/`, `scrapers/`
- **Major subsystems:**
  - Auth/JWT + user identity
  - Listing/read models + seller ingestion
  - Billing/Stripe + entitlement logic
  - NDA/plan gating middleware
  - Marketplace scraping (IronPlanet)
  - Request envelope + centralized error handling

### `apps/web`

- **Package:** `@easyfinderai/web`
- **Scripts:**
  - `dev`, `build`, `preview`
  - `lint`, `typecheck`, `test`
- **Entrypoints:**
  - Runtime bootstrap: `src/main.tsx`
  - App/router root: `src/App.tsx`
- **Top-level `src` folders:** `components/`, `generated/`, `layouts/`, `lib/`, `pages/`
- **Major subsystems:**
  - Router + guarded app/demo areas
  - Auth/runtime context providers
  - API layer + error handling
  - Billing/role/UI access guards
  - Generated OpenAPI type consumption

### `packages/shared`

- **Package:** `@easyfinderai/shared`
- **Scripts:** `dev`, `build`, `lint`, `typecheck`, `test`
- **Entrypoints:**
  - Source export barrel: `src/index.ts`
  - Build output export entry: `dist/index.js`
- **Top-level `src` folders:** none (flat files)
- **Major subsystems:**
  - Shared Zod schema types and DTOs
  - Demo fixtures/data
  - Demo image normalization utilities
  - Core listing scoring model (`scoreListing`)

## API server inventory (`apps/api/src/server.ts`)

### Registered route modules

- `healthRoutes` → `/api`
- `demoListingRoutes` → `/api/demo/listings`
- `listingRoutes` → `/api/listings`
- `scoringRoutes` → `/api/scoring-configs`
- `watchlistRoutes` → `/api/watchlist`
- `offersRoutes` → `/api/offers`
- `inquiriesRoutes` → `/api/inquiries`
- `authRoutes` → `/api/auth`
- `adminRoutes` → `/api/admin`
- `sellerRoutes` → `/api/seller`
- `meRoutes` → `/api/me`
- `ironPlanetScraperRoutes` → explicit `/api/scrape/ironplanet`
- `ndaRoutes` → `/api/nda`
- `billingRoutes` → `/api/billing`

### Global middleware/hooks/plugins

- Fastify plugins: `@fastify/cors`, `@fastify/helmet`, `@fastify/jwt`, `@fastify/rate-limit` (prod), `@fastify/multipart`
- Request hook:
  - assign `requestId`
  - set `x-request-id`
  - optional bearer token decode
- Response hook:
  - security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`)
- Decorator: `app.authenticate`
- Centralized error handler with structured envelope and `requestId`

## API route inventory table

> Full route path = registered prefix + route file path.

| Module | Base prefix | Endpoints (method path) | Key gates / notes |
|---|---|---|---|
| `health.ts` | `/api` | `GET /health` | Public health envelope |
| `demo-listings.ts` | `/api/demo/listings` | `GET /`, `GET /:id` | Public demo catalog |
| `listings.ts` | `/api/listings` | `GET /`, `GET /:id`, `POST /`, `PUT /`, `DELETE /` | Live reads gated by `authenticate + requireNDA`; writes also `disableWritesInDemo` |
| `scoring.ts` | `/api/scoring-configs` | `GET /`, `POST /` | `POST` gated by `authenticate + requirePlan([pro, enterprise])` and buyer/admin role check |
| `watchlist.ts` | `/api/watchlist` | `GET /`, `POST /:listingId`, `DELETE /:listingId` | `authenticate + requireNDA + requirePlan([pro, enterprise])`; pro watchlist cap |
| `offers.ts` | `/api/offers` | `POST /` | `authenticate + requireNDA + disableWritesInDemo`; currently not implemented |
| `inquiries.ts` | `/api/inquiries` | `POST /` | `authenticate`; buyer/admin authorization in-handler |
| `auth.ts` | `/api/auth` | `POST /register`, `POST /login`, `POST /forgot-password`, `POST /reset-password`, `GET /me` | Auth lifecycle, password reset, session self-read |
| `admin.ts` | `/api/admin` | `POST /sources/sync`, `POST /sources/mock-sync`, `GET /sources` | `authenticate + requirePlan([enterprise])` plus admin-role in-handler; some writes blocked in demo |
| `seller.ts` | `/api/seller` | `GET /listings`, `GET /inquiries`, `GET /insights`, `POST /listings/import`, `POST /upload` | Seller workflows; import/upload gated by `authenticate + requireNDA + requirePlan([pro, enterprise]) + disableWritesInDemo` |
| `me.ts` | `/api/me` | `GET /`, `PATCH /role` | Identity + role transition; `GET` requires NDA |
| `nda.ts` | `/api/nda` | `GET /status`, `POST /accept` | Authenticated NDA lifecycle |
| `billing.ts` | `/api/billing` | `POST /activate-pro-promo`, `POST /create-checkout-session`, `POST /webhook` | Authenticated promo/checkout; webhook uses raw body + Stripe signature verification |
| `scrapers.ironplanet.ts` | (none) | `GET /api/scrape/ironplanet` | `disableWritesInDemo`; URL validation + scraper execution |

## Middleware list (`apps/api/src/middleware`)

- `disableWritesInDemo.ts` — blocks mutations when `DEMO_MODE=true` (with test override).
- `requireNDA.ts` — enforces accepted NDA on protected resources.
- `requirePlan.ts` — enforces allowed billing plans and active billing status/promo handling.

## Scraper list

- **Route wrapper:** `apps/api/src/routes/scrapers.ironplanet.ts`
  - endpoint: `GET /api/scrape/ironplanet?url=...`
- **Scraper implementation:** `apps/api/src/scrapers/ironplanet.ts`
  - fetch + parse listing/search pages with Cheerio
  - normalize listing payloads
  - upsert scraped listings by source external id
- **Scraper validation:** `apps/api/src/scrapers/ironplanet.validation.ts`
  - URL allow-list/validation before scrape

## Billing + entitlement gating locations

### Auth gates

- Global auth mechanism is `app.authenticate` in `src/server.ts`.
- Route-level auth is attached via `preHandler: app.authenticate` (or arrays including it).

### NDA gates

- `requireNDA` middleware applied to live listings, watchlist, seller workflows, `/api/me`, offers.

### Plan/billing gates

- `requirePlan` middleware in:
  - scoring config mutation
  - watchlist routes
  - admin routes (enterprise)
  - seller import/upload
- `requirePlan` resolves billing via `normalizeBilling` + `isBillingActive`.
- Additional entitlements are derived from `src/entitlements.ts` and used in seller/billing/me routes.

### Where error envelopes are defined

- Primary response envelope helpers:
  - `ok()` / `fail()` in `apps/api/src/response.ts`
- Centralized server-level error envelope:
  - `app.setErrorHandler(...)` in `apps/api/src/server.ts`
- Some route-local explicit envelopes (e.g., scraper + webhook errors) still return `error` payloads with status codes.

## Web architecture inventory

### Routing structure

Main router is in `apps/web/src/App.tsx` using `react-router-dom`:

- Public routes: `/`, `/login`, `/register`, `/forgot-password`, `/reset-password` (plus `/app/login` and `/app/register` aliases).
- Authenticated app routes under `/app/*` wrapped by:
  - `RequireAuth`
  - `RequireRoleSelection`
  - `NdaProvider`
  - `RequireLiveNda`
  - `LiveLayout`
- Role segmented app areas:
  - buyer/enterprise/admin: listings, watchlist, scoring, offers
  - seller: dashboard, listings, inquiries, pipeline, add, upload
  - enterprise settings behind `RequireEnterprise`
- Demo routes under `/demo/*` via `DemoLayout` and demo tour redirects.

### API base URL resolution

- `apps/web/src/env.ts`:
  - reads `VITE_API_BASE_URL` or `VITE_API_URL`
  - fallback: production `https://easyfinder.fly.dev`, otherwise `http://127.0.0.1:8080`
  - exports `getApiBaseUrl` and `requireApiBaseUrl`
- `apps/web/src/lib/api.ts`:
  - normalizes API paths (`/api` prefix handling)
  - builds final URLs with `buildApiUrl`
  - handles token auth headers and request timeout behavior

### OpenAPI type usage + generation status

- OpenAPI types are imported in `apps/web/src/lib/apiClient.ts` from `../generated/openapi`.
- Generated file exists at `apps/web/src/generated/openapi.ts`.
- File banner confirms it is auto-generated by `openapi-typescript`.

## Shared package inventory

### Scoring logic location

- Primary algorithm: `packages/shared/src/scoring.ts`
  - `defaultScoringConfig`
  - `scoreListing(...)`

### Exports

- Export barrel: `packages/shared/src/index.ts`
  - namespace exports for `types`, `data`, `demoImages`, `scoring`
  - explicit schema/type exports
  - scoring exports (`defaultScoringConfig`, `DefaultScoringConfig`, `scoreListing`)

### Which apps import shared

- `apps/api` imports `@easyfinderai/shared` for:
  - types/envelopes
  - demo fixtures
  - scoring logic
- `apps/web` imports `@easyfinderai/shared` for:
  - shared listing/watchlist/scoring types
  - demo fixtures + scoring helpers
- Both workspaces depend on shared via `workspace:*` in package manifests.

## OpenAPI flow (spec → generation → usage)

1. **Spec source:** root `openapi.yml`.
2. **Generation command:** root script
   - `pnpm openapi:types`
   - executes: `openapi-typescript ./openapi.yml -o ./apps/web/src/generated/openapi.ts`
3. **Type consumption:** frontend imports generated types from `apps/web/src/generated/openapi.ts` through `apps/web/src/lib/apiClient.ts`.
4. **Validation command:** `pnpm openapi:validate` (swagger-cli) before/after spec edits.

## Dev workflow commands

### Root (turborepo orchestration)

- `pnpm dev` — run workspace dev tasks in parallel
- `pnpm build` — build all workspaces
- `pnpm lint` — lint all workspaces
- `pnpm typecheck` — typecheck all workspaces
- `pnpm test` — run all tests
- `pnpm openapi:validate` — validate OpenAPI schema
- `pnpm openapi:types` — regenerate frontend OpenAPI types

### Workspace-local

- API: `pnpm --filter @easyfinderai/api dev|build|lint|typecheck|test`
- Web: `pnpm --filter @easyfinderai/web dev|build|lint|typecheck|test`
- Shared: `pnpm --filter @easyfinderai/shared dev|build|lint|typecheck|test`

## “Where to change X” quick index

- **Add/modify API endpoint wiring** → `apps/api/src/server.ts` + corresponding file in `apps/api/src/routes/`
- **Change auth policy** → `apps/api/src/server.ts` (`app.authenticate`) and route `preHandler` assignments
- **Change NDA policy** → `apps/api/src/middleware/requireNDA.ts`
- **Change plan/billing gate behavior** → `apps/api/src/middleware/requirePlan.ts`, `apps/api/src/billing.ts`, `apps/api/src/entitlements.ts`
- **Change Stripe checkout/webhooks** → `apps/api/src/routes/billing.ts`, `apps/api/src/stripe.ts`
- **Change scraping behavior** → `apps/api/src/scrapers/ironplanet.ts` (+ validation in `ironplanet.validation.ts`)
- **Change API response envelope** → `apps/api/src/response.ts` and `apps/api/src/server.ts` error handler
- **Change frontend routing/guards** → `apps/web/src/App.tsx` + `apps/web/src/components/Require*.tsx`
- **Change API base URL logic on web** → `apps/web/src/env.ts` and `apps/web/src/lib/api.ts`
- **Change OpenAPI typings** → edit `openapi.yml`, then run `pnpm openapi:types`, consume via `apps/web/src/lib/apiClient.ts`
- **Change scoring model** → `packages/shared/src/scoring.ts` (shared by both API and web)
- **Change shared DTO/schema contracts** → `packages/shared/src/types.ts` + `packages/shared/src/index.ts` exports
