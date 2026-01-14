import os
import stripe
from fastapi import APIRouter, Depends, Request, HTTPException, status
from core.deps import get_current_user

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

router = APIRouter(prefix="/api/billing", tags=["billing"])


@router.post("/checkout")
def create_checkout(user: dict = Depends(get_current_user)):
    email = user.get("sub")
    if not email:
        raise HTTPException(status_code=400, detail="Invalid user token")

    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            payment_method_types=["card"],
            line_items=[
                {
                    "price": os.getenv("STRIPE_PRICE_ID"),
                    "quantity": 1,
                }
            ],
            success_url="https://app.easyfinder.ai/success",
            cancel_url="https://app.easyfinder.ai/cancel",
            customer_email=email,
            metadata={"email": email},
        )
        return {"url": session.url}

    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload,
            sig_header,
            STRIPE_WEBHOOK_SECRET,
        )
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        email = session["metadata"].get("email")

        if email:
            upgrade_user_to_paid(email)

    return {"status": "ok"}


# ---- TEMP STUB (replace later with DB logic) ----
def upgrade_user_to_paid(email: str):
    print(f"[STRIPE] Upgrading {email} to PAID tier")
