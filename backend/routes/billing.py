import stripe
from fastapi import APIRouter, Request
from core.jwt import create_access_token

stripe.api_key = "STRIPE_SECRET_KEY"

router = APIRouter(tags=["Billing"])


@router.post("/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature")

    event = stripe.Webhook.construct_event(
        payload, sig, "STRIPE_WEBHOOK_SECRET"
    )

    if event["type"] == "checkout.session.completed":
        email = event["data"]["object"]["customer_email"]

        # 🔥 Issue PAID token
        token = create_access_token({
            "sub": email,
            "tier": "paid",
            "scopes": ["inventory:read", "billing:write"]
        })

        # In real life → email or frontend refresh
        return {"access_token": token}

    return {"status": "ignored"}
