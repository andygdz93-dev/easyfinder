from fastapi import APIRouter, Request, HTTPException
from backend.db.mongo import get_database
import stripe
import os

router = APIRouter(tags=["Stripe"])

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

@router.post("/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, WEBHOOK_SECRET
        )
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        email = session["customer_email"]

        db = get_database()

        await db.users.update_one(
            {"email": email},
            {
                "$set": {
                    "tier": "paid",
                    "scopes": ["inventory", "export", "saved_searches"],
                }
            },
            upsert=True,
        )

    return {"ok": True}