import type { FastifyInstance } from "fastify";
import { defaultScoringConfig, scoreListing } from "@easyfinderai/shared";
import { fail, ok } from "../response.js";
import { requirePlan } from "../middleware/requirePlan.js";
import { listings } from "../store.js";
import { requireNDA } from "../middleware/requireNDA.js";
import { config } from "../config.js";
import { disableWritesInDemo } from "../middleware/disableWritesInDemo.js";
import { audit } from "../lib/audit.js";
import { getUsersCollection } from "../users.js";
import { defaultBilling, normalizeBilling } from "../billing.js";
import { getSellerEntitlements } from "../entitlements.js";
import { ObjectId } from "mongodb";


const getActiveListingCountForSeller = (sellerId: string) =>
  listings.filter((listing) => listing.source === `seller:${sellerId}`).length;

export default async function listingsRoutes(app: FastifyInstance) {
  /**
   * GET /api/listings
   * Returns ranked live listings
   */
  app.get("/", { preHandler: [app.authenticate, requireNDA, requirePlan(["pro", "enterprise"])] }, async (request, reply) => {
    if (config.demoMode) {
      return fail(
        request,
        reply,
        "DEMO_MODE_ACTIVE",
        "LIVE listings are disabled while DEMO_MODE is enabled.",
        503
      );
    }

    const scored = listings.map((listing) => {
      const score = scoreListing(listing, defaultScoringConfig);
      return {
        ...listing,
        totalScore: score.total,
        score,
      };
    });

    const data = scored.sort((a, b) => {
      const scoreDiff = (b.totalScore ?? 0) - (a.totalScore ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      return (a.price ?? 0) - (b.price ?? 0);
    });

    return ok(request, data);
  });

  /**
   * GET /api/listings/:id
   * Live listing detail
   */
  app.get<{ Params: { id: string } }>(
    "/:id",
    { preHandler: [app.authenticate, requireNDA, requirePlan(["pro", "enterprise"])] },
    async (request, reply) => {
    const { id } = request.params;

    if (config.demoMode) {
      return fail(
        request,
        reply,
        "DEMO_MODE_ACTIVE",
        "LIVE listings are disabled while DEMO_MODE is enabled.",
        503
      );
    }

    const listing = listings.find((l) => l.id === id);

    if (!listing) {
      return fail(request, reply, "NOT_FOUND", "Listing not found", 404);
    }

    const score = scoreListing(listing, defaultScoringConfig);

    return ok(request, {
      ...listing,
      totalScore: score.total,
      score,
    });
    }
  );

  const writeHandlers = {
    preHandler: [app.authenticate, requireNDA, disableWritesInDemo],
  };

  app.post("/", writeHandlers, async (request, reply) => {
    if (request.user.role === "seller" || request.user.role === "enterprise") {
      if (ObjectId.isValid(request.user.id)) {
        const user = await getUsersCollection().findOne({ _id: new ObjectId(request.user.id) });

        if (user) {
          const billing = normalizeBilling(user.billing ?? defaultBilling());
          const entitlements = getSellerEntitlements({
            plan: billing.plan,
            role: user.role,
          });

          if (typeof entitlements.maxActiveListings === "number") {
            const activeListingCount = getActiveListingCountForSeller(request.user.id);

            if (activeListingCount >= entitlements.maxActiveListings) {
              return fail(
                request,
                reply,
                "plan_limit_reached",
                "Active listing limit reached for your plan.",
                403
              );
            }
          }
        }
      }
    }

    audit("LISTING_CREATED", {
      userId: request.user.id,
      ip: request.ip,
    });

    return fail(request, reply, "NOT_IMPLEMENTED", "Listing creation is not available yet.", 501);
  });

  app.put("/", writeHandlers, async (request, reply) => {
    return fail(request, reply, "NOT_IMPLEMENTED", "Listing updates are not available yet.", 501);
  });

  app.delete("/", writeHandlers, async (request, reply) => {
    return fail(request, reply, "NOT_IMPLEMENTED", "Listing deletion is not available yet.", 501);
  });
}
