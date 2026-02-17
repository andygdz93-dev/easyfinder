# Staging Deployment Checklist

Use this checklist to stand up and maintain the EasyFinder staging environment.

## A) Fly staging API setup

- Create the staging Fly app:

  ```bash
  fly apps create easyfinder-stg
  ```

- Deploy using the staging Fly config:

  ```bash
  fly deploy -c fly.staging.toml
  ```

- Set required staging secrets:

  ```bash
  fly secrets set \
    NODE_ENV=production \
    JWT_SECRET=<generate-long-random> \
    MONGO_URL=<same cluster ok> \
    DB_NAME=easyfinder_stg \
    APP_BASE_URL=<your Vercel preview base url or placeholder> \
    CORS_ORIGINS=<comma list including Vercel preview domain(s) + localhost> \
    BILLING_ENABLED=false \
    EMAIL_ENABLED=false \
    -a easyfinder-stg
  ```

- Optional later: enable billing/email in staging only when explicitly testing those flows, using Stripe test keys and Resend keys.

## B) Vercel preview env var setup

- In your Vercel project settings, set the **Preview** environment variable:

  ```bash
  VITE_API_BASE_URL=https://easyfinder-stg.fly.dev
  ```

- Ensure the **Production** environment variable remains:

  ```bash
  VITE_API_BASE_URL=https://easyfinder.fly.dev
  ```

- Local development should keep using `.env.local` and that file is not committed.

## C) Mongo strategy

- Fastest path: use the same Mongo cluster as production, but set `DB_NAME=easyfinder_stg` for staging isolation.

## D) Safety notes

- Never commit `.env` or `.env.*` files (except `.env.example`).
- Never commit `node_modules`, `dist`, or `.turbo`.
- Keep `BILLING_ENABLED=false` and `EMAIL_ENABLED=false` in staging unless explicitly testing those integrations.
