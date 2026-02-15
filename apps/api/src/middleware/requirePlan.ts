import { FastifyReply, FastifyRequest } from "fastify";
import { ObjectId } from "mongodb";
import { BillingPlan, isBillingActive, normalizeBilling } from "../billing.js";
import { env } from "../env.js";
import { fail } from "../response.js";
import { getUsersCollection } from "../users.js";

const billingEnabled =
  env.BILLING_ENABLED === true ||
  String(env.BILLING_ENABLED) === "true" ||
  String(env.BILLING_ENABLED) === "1";

export const requirePlan =
  (allowedPlans: BillingPlan[]) =>
  async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user?.id;
    if (!userId || !ObjectId.isValid(userId)) {
      return fail(request, reply, "UNAUTHORIZED", "Authentication required.", 401);
    }

    const col = getUsersCollection();
    const user = await col.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return fail(request, reply, "NOT_FOUND", "User not found.", 404);
    }

    const billing = normalizeBilling(user.billing);
    request.billing = billing;
    const effectivePlan = env.BILLING_STUB_PLAN ?? billing.plan;

    if (!billingEnabled) {
      if (!allowedPlans.includes(effectivePlan)) {
        return reply.code(403).send({
          error: "upgrade_required",
        });
      }

      return;
    }

    const isSellerPromoActive =
      billing.plan === "pro" &&
      billing.isPromo === true;

    const active = isBillingActive(billing) || isSellerPromoActive;

    if (!allowedPlans.includes(effectivePlan) || !active) {
      return reply.code(403).send({
        error: "upgrade_required",
      });
    }
  };
