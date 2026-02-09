import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { ObjectId } from "mongodb";
import type Stripe from "stripe";
import { getStripe, requireStripeWebhookSecret } from "../stripe.js";
import rawBody from "fastify-raw-body";
import { getUsersCollection } from "../users.js";
import { fail, ok } from "../response.js";
import {
  BillingInfo,
  billingFromSubscription,
  defaultBilling,
  normalizeBilling,
  priceIdByPlan,
  serializeBilling,
} from "../billing.js";
import { writeAuditLog } from "../audit.js";
import { config } from "../config.js";

const createCheckoutSchema = z.object({
  plan: z.enum(["pro", "enterprise"]),
});

const normalizeHeader = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const resolveOrigin = (request: FastifyRequest) => {
  const origin = normalizeHeader(request.headers.origin);
  if (origin) return origin;
  const host = normalizeHeader(request.headers.host);
  if (host && request.protocol) {
    return `${request.protocol}://${host}`;
  }
  return undefined;
};

const updateUserBilling = async ({
  userId,
  nextBilling,
  eventId,
  eventType,
}: {
  userId: ObjectId;
  nextBilling: BillingInfo;
  eventId?: string;
  eventType?: string;
}) => {
  const col = getUsersCollection();
  const user = await col.findOne({ _id: userId });
  if (!user) return;

  const previous = normalizeBilling(user.billing);
  await col.updateOne(
    { _id: userId },
    {
      $set: {
        billing: nextBilling,
        updatedAt: new Date(),
      },
    }
  );

  await writeAuditLog("billing_status_changed", {
    user_id: userId.toHexString(),
    old_values: serializeBilling(previous),
    new_values: serializeBilling(nextBilling),
    stripe_event_id: eventId,
    stripe_event_type: eventType,
  });
};

const handleSubscriptionUpdate = async (
  subscription: Stripe.Subscription,
  eventType: string,
  eventId: string,
  statusOverride?: BillingInfo["status"],
  planOverride?: BillingInfo["plan"]
) => {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
  if (!customerId) return;

  const col = getUsersCollection();
  const user = await col.findOne({ "billing.stripe_customer_id": customerId });
  if (!user) return;

  const nextBilling = billingFromSubscription(
    subscription,
    planOverride,
    statusOverride
  );
  await updateUserBilling({
    userId: user._id,
    nextBilling,
    eventId,
    eventType,
  });
};

export default async function billingRoutes(app: FastifyInstance) {
  app.register(rawBody, {
    field: "rawBody",
    global: false,
    encoding: "utf8",
    runFirst: true,
  });

  app.post(
    "/create-checkout-session",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const payload = createCheckoutSchema.parse(request.body);
      const userId = request.user?.id;
      if (!userId || !ObjectId.isValid(userId)) {
        return fail(request, reply, "NOT_FOUND", "User not found.", 404);
      }

      const col = getUsersCollection();
      const user = await col.findOne({ _id: new ObjectId(userId) });
      if (!user) {
        return fail(request, reply, "NOT_FOUND", "User not found.", 404);
      }

      const billing = normalizeBilling(user.billing ?? defaultBilling());

      const stripe = getStripe();
      let stripeCustomerId = billing.stripe_customer_id;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name,
          metadata: { user_id: user._id.toHexString() },
        });
        stripeCustomerId = customer.id;
        billing.stripe_customer_id = stripeCustomerId;
        await col.updateOne(
          { _id: user._id },
          { $set: { billing, updatedAt: new Date() } }
        );
      }

      const origin = resolveOrigin(request) ?? config.corsOrigins[0];
      const successUrl = `${origin}/app/upgrade?status=success`;
      const cancelUrl = `${origin}/app/upgrade?status=cancel`;

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: stripeCustomerId,
        line_items: [
          {
            price: priceIdByPlan[payload.plan],
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          user_id: user._id.toHexString(),
          plan: payload.plan,
        },
        subscription_data: {
          metadata: {
            user_id: user._id.toHexString(),
          },
        },
      });

      await writeAuditLog("billing_checkout_created", {
        user_id: user._id.toHexString(),
        new_values: {
          plan: payload.plan,
          stripe_customer_id: stripeCustomerId,
          stripe_session_id: session.id,
        },
        metadata: {
          origin: origin || undefined,
        },
      });

      return ok(request, { url: session.url });
    }
  );

  app.post(
    "/webhook",
    { config: { rawBody: true } },
    async (request, reply) => {
      const sig = Array.isArray(request.headers["stripe-signature"])
        ? request.headers["stripe-signature"][0]
        : request.headers["stripe-signature"];
      if (!sig) {
        return reply.status(400).send({ error: "Missing Stripe-Signature header" });
      }

      if (!request.rawBody) {
        return reply.status(400).send({ error: "Missing raw body" });
      }

      let event: Stripe.Event;
      try {
        const webhookSecret = requireStripeWebhookSecret();
        const stripe = getStripe();
        event = stripe.webhooks.constructEvent(request.rawBody, sig, webhookSecret);
      } catch (error: any) {
        return reply.status(400).send({ error: `Webhook Error: ${error.message}` });
      }

      const stripe = getStripe();
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          if (!session.subscription) break;
          const subscription =
            typeof session.subscription === "string"
              ? await stripe.subscriptions.retrieve(session.subscription)
              : session.subscription;
          if (!subscription) break;
          await handleSubscriptionUpdate(subscription, event.type, event.id);
          break;
        }
        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionUpdate(subscription, event.type, event.id);
          break;
        }
        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionUpdate(
            subscription,
            event.type,
            event.id,
            "canceled",
            "free"
          );
          break;
        }
        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          if (!invoice.subscription) break;
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          );
          await handleSubscriptionUpdate(
            subscription,
            event.type,
            event.id,
            "past_due"
          );
          break;
        }
        default:
          break;
      }

      return reply.status(200).send({ received: true });
    }
  );
}
