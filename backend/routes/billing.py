import os
import stripe
from fastapi import APIRouter, Depends, Request, HTTPException

from core.deps import get_current_user

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

router = APIRouter(prefix="/api/billing", tags=["Billing"])


@router.post("/checkout")
def create_checkout_session(user=Depends(get_current_user)):
    if user.get("tier") == "paid":
        raise HTTPException(status_code=400, detail="Already on paid plan")

    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            payment_method_types=["card"],
            line_items=[{
                "price": os.getenv("STRIPE_PRICE_ID"),
                "quantity": 1,
            }],
            customer_email=user["sub"],
            success_url=os.getenv("STRIPE_SUCCESS_URL"),
            cancel_url=os.getenv("STRIPE_CANCEL_URL"),
            metadata={
                "email": user["sub"]
            }
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"url": session.url}


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
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        email = session["metadata"]["email"]

        # ✅ THIS is where you upgrade the user in DB
        # Example (pseudo-code):
        # await users.update_one(
        #     {"email": email},
        #     {"$set": {"tier": "paid"}}
        # )

        print(f"User upgraded to PAID: {email}")

    return {"status": "ok"}
