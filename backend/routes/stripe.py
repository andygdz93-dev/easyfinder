from fastapi import APIRouter, Request, HTTPException
from backend.db.mongo import get_database
import stripe
import os

router = APIRouter(tags=["Stripe"])
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

@router.post("/stripe/webhook")
async def stripe_webhook(payload: dict):
    email = payload["data"]["object"]["customer_email"]
    tier = "paid"

    db = get_database()

    await db.users.update_one(
        {"email": email},
        {"$set": {"tier": tier}},
        upsert=True
    )

    return {"ok": True}



   
