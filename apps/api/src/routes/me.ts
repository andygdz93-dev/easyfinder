import { FastifyInstance } from "fastify";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { AuthUser } from "../auth.js";
import { defaultBilling, isBillingActive, normalizeBilling, serializeBilling } from "../billing.js";
import { getUsersCollection } from "../users.js";
import { requireNDA } from "../middleware/requireNDA.js";
import { fail, ok } from "../response.js";
import { env } from "../env.js";
import { getSellerEntitlements } from "../entitlements.js";

const roleUpdateSchema = z.object({
  role: z.enum(["buyer", "seller", "enterprise"]),
});

const toUserDto = (user: {
  _id: ObjectId;
  email: string;
  name: string;
  role: "buyer" | "seller" | "enterprise" | "admin" | null;
  ndaAccepted?: boolean;
  ndaAcceptedAt?: Date | null;
  ndaVersion?: string;
  billing?: {
    stripe_customer_id?: string;
    stripe_subscription_id?: string;
    plan: "free" | "pro" | "enterprise";
    status: "active" | "past_due" | "canceled" | "incomplete";
    current_period_end: Date;
  };
}) => ({
  id: user._id.toHexString(),
  email: user.email,
  name: user.name,
  role: user.role,
  ndaAccepted: Boolean(user.ndaAccepted),
  ndaAcceptedAt: user.ndaAcceptedAt ? user.ndaAcceptedAt.toISOString() : null,
  ndaVersion: user.ndaVersion,
  billing: serializeBilling(normalizeBilling(user.billing ?? defaultBilling())),
});

const resolveBillingPlan = (fallbackPlan: "free" | "pro" | "enterprise" = "free") => {
  if (env.BILLING_STUB_PLAN) {
    return env.BILLING_STUB_PLAN;
  }

  return env.BILLING_ENABLED ? fallbackPlan : "free";
};

const withSellerEntitlements = (billing: {
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  plan: "free" | "pro" | "enterprise";
  status: "active" | "past_due" | "canceled" | "incomplete";
  current_period_end: string;
}, role: "buyer" | "seller" | "enterprise" | "admin" | null) => {
  const entitlements = getSellerEntitlements({ plan: billing.plan, role });

  return {
    ...billing,
    promoActive: entitlements.promoActive,
    promoEndsAt: entitlements.promoEndsAt,
    entitlements: {
      maxActiveListings: entitlements.maxActiveListings,
      csvUpload: entitlements.csvUpload,
      marketplaceIntegrations: entitlements.marketplaceIntegrations,
    },
  };
};

export default async function meRoutes(app: FastifyInstance) {
  const usersCollection = () => getUsersCollection();

  app.get("/", { preHandler: [app.authenticate, requireNDA] }, async (request) => {
    const fallbackUser = () => {
      const currentUser = request.user as Partial<AuthUser>;
      return {
        id: currentUser.id,
        email: currentUser.email,
        name: currentUser.name,
        role: (currentUser.role as "buyer" | "seller" | "enterprise" | "admin" | null) ?? null,
        ndaAccepted: Boolean(currentUser.ndaAccepted),
        ndaAcceptedAt: currentUser.ndaAcceptedAt
          ? new Date(currentUser.ndaAcceptedAt).toISOString()
          : null,
        billing: withSellerEntitlements(
          {
            ...serializeBilling(defaultBilling()),
            plan: resolveBillingPlan(),
          },
          (currentUser.role as "buyer" | "seller" | "enterprise" | "admin" | null) ?? null
        ),
      };
    };

    const fallback = fallbackUser();

    if (!fallback.id || !ObjectId.isValid(fallback.id)) {
      return { data: fallback };
    }

    try {
      const col = usersCollection();
      const user = await col.findOne({ _id: new ObjectId(fallback.id) });

      if (!user) {
        return { data: fallback };
      }

      const userDto = toUserDto(user);
      return {
        data: {
          ...userDto,
          billing: withSellerEntitlements(
            {
              ...userDto.billing,
              plan: resolveBillingPlan(userDto.billing.plan),
            },
            userDto.role
          ),
        },
      };
    } catch {
      return { data: fallback };
    }
  });

  app.patch("/role", { preHandler: app.authenticate }, async (request, reply) => {
    const payload = roleUpdateSchema.parse(request.body);
    const userId = request.user?.id;

    if (!userId || !ObjectId.isValid(userId)) {
      return fail(request, reply, "NOT_FOUND", "User not found.", 404);
    }

    const col = usersCollection();
    const existing = await col.findOne({ _id: new ObjectId(userId) });

    if (!existing) {
      return fail(request, reply, "NOT_FOUND", "User not found.", 404);
    }

    if (payload.role === "enterprise") {
      const billing = normalizeBilling(existing.billing ?? defaultBilling());
      if (!(isBillingActive(billing) && billing.plan === "enterprise")) {
        return fail(
          request,
          reply,
          "ROLE_NOT_ALLOWED",
          "Enterprise role requires an active enterprise subscription.",
          403
        );
      }
    }

    await col.updateOne(
      { _id: existing._id },
      {
        $set: {
          role: payload.role,
          roleSetAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    const updated = await col.findOne({ _id: existing._id });
    if (!updated) {
      return fail(request, reply, "NOT_FOUND", "User not found.", 404);
    }

    return ok(request, toUserDto(updated));
  });
}
