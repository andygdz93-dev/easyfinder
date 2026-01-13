import stripe
from fastapi import APIRouter, Depends, Request
from core.deps import require_jwt

stripe.api_key = "STRIPE_SECRET_KEY"

router = APIRouter(prefix="/api/billing", tags=["Billing"])

@router.post("/checkout")
def create_checkout(user=Depends(require_jwt)):
    session = stripe.checkout.Session.create(
        mode="subscription",
        payment_method_types=["card"],
        line_items=[{
            "price": "price_123",  # Stripe price ID
            "quantity": 1
        }],
        success_url="https://app.easyfinder.ai/success",
        cancel_url="https://app.easyfinder.ai/cancel",
        customer_email=user.email,
        metadata={"email": user.email}
    )

    return {"url": session.url}

@router.post("/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature")

    event = stripe.Webhook.construct_event(
        payload, sig, "STRIPE_WEBHOOK_SECRET"
    )

    if event["type"] == "checkout.session.completed":
        email = event["data"]["object"]["metadata"]["email"]

        # 🔥 Upgrade user
        upgrade_user_to_paid(email)

    return {"status": "ok"}
