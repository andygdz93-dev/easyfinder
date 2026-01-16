from fastapi import APIRouter, Request, HTTPException
from core.jwt import create_access_token
import stripe
import os

router = APIRouter(prefix="/api/stripe", tags=["Stripe"])

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")


@router.post("/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload,
            sig,
            os.getenv("STRIPE_WEBHOOK_SECRET"),
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webhook")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]

        email = session["customer_email"]

        # issue upgraded token
        upgraded_token = create_access_token({
            "sub": email,
            "tier": "paid",
            "scopes": ["paid", "inventory"],
        })

        # TODO: save token / user in DB later
        print("UPGRADED TOKEN:", upgraded_token)

    return {"status": "ok"}
