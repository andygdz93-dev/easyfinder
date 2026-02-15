# Stripe Webhook URL Verification (Fly)

Verified for EasyFinder monorepo backend (`apps/api`) deployed on Fly.

- Fly app name: `easyfinder`
- Backend base URL: `https://easyfinder.fly.dev`
- Stripe webhook route: `/api/billing/webhook`
- Stripe webhook full URL: `https://easyfinder.fly.dev/api/billing/webhook`
- Required env var: `STRIPE_WEBHOOK_SECRET`

## Stripe event checklist (subscription billing)
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded` (optional but helpful)
- `invoice.payment_failed` (optional but helpful)
