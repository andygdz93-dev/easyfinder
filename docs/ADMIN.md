# EasyFinder Admin

Canonical admin policy and operations reference.

## Admin control center behavior

### Feature flags and policy gates

- `ADMIN_ENABLED` (default `true`)
  - When `false`, admin endpoints return `404 ADMIN_DISABLED`.
- `ADMIN_EMAIL_ALLOWLIST` (optional comma-separated emails)
  - Enforces allowlisting in addition to role checks.
- Admin API routes are protected by `app.authenticate` + `requireAdmin`.
- NDA middleware (`requireNDA`) explicitly bypasses NDA requirements for admins.

## Admin API endpoints

Under `/api/admin`:

- `GET /overview`
- `GET /listings`
- `GET /listings/:id`
- `PATCH /listings/:id`
- `DELETE /listings/:id`
- `GET /inquiries`
- `PATCH /inquiries/:id`
- `GET /scoring-config`
- `POST /scoring-config`
- `GET /audit`
- `POST /scrape/ironplanet`

For request/response shapes, use `openapi.yml`.

## Admin UI routes

- `/admin/home`
- `/admin/listings`
- `/admin/listings/:id`
- `/admin/inquiries`
- `/admin/audit`

Legacy bridge routes under `/app/admin/*` remain and redirect into `/admin/*`.

## Admin bootstrap / promotion

Use the API helper to promote an existing user:

```bash
pnpm --filter @easyfinderai/api promote-admin -- --email fernandogarciarodriguez78@gmail.com
pnpm --filter @easyfinderai/api promote-admin -- --email andygdz653@gmail.com
```

Production usage requires explicit opt-in:

```bash
pnpm --filter @easyfinderai/api promote-admin -- --email fernandogarciarodriguez78@gmail.com --allow-production
```

Notes:

- `promote-admin` only works for users that already exist in the database.
