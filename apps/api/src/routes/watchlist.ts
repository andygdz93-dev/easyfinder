import { FastifyInstance, FastifyRequest } from "fastify";
import { watchlists, listings, demoUserId } from "../store.js";
import { env } from "../env.js";
import { demoListings } from "@easyfinderai/shared";
import { ok, fail } from "../response.js";
import { WatchlistItem } from "@easyfinderai/shared";
import { requirePlan } from "../middleware/requirePlan.js";

const resolveUserId = (request: FastifyRequest) => request.user?.id ?? demoUserId;

export default async function watchlistRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [app.authenticate, requirePlan(["pro", "enterprise"])] }, async (request) => {
    const userId = resolveUserId(request);
    const watchlist = watchlists.get(userId) ?? new Map<string, WatchlistItem>();
    return ok(request, { items: Array.from(watchlist.values()) });
  });

  app.post<{ Params: { listingId: string } }>(
    "/:listingId",
    { preHandler: [app.authenticate, requirePlan(["pro", "enterprise"])] },
    async (request, reply) => {
    const userId = resolveUserId(request);
    const { listingId } = request.params;

    const liveListing = listings.find((listing) => listing.id === listingId);
    const allowDemo = env.DEMO_MODE || env.NODE_ENV === "test";
    const demoListing = allowDemo ? demoListings.find((listing) => listing.id === listingId) : null;

    if (!liveListing && !demoListing) {
      return fail(request, reply, "NOT_FOUND", "Listing not found.", 404);
    }

    const watchlist = watchlists.get(userId) ?? new Map<string, WatchlistItem>();
    const existing = watchlist.get(listingId);
    if (existing) {
      return ok(request, { item: existing });
    }

    if (request.billing?.plan === "pro" && watchlist.size >= 50) {
      return fail(
        request,
        reply,
        "PLAN_LIMIT",
        "Pro plan watchlist limit reached.",
        402
      );
    }

    const item: WatchlistItem = {
      id: `${userId}:${listingId}`,
      userId,
      listingId,
      createdAt: new Date().toISOString(),
    };
    watchlist.set(listingId, item);
    watchlists.set(userId, watchlist);
    return ok(request, { item });
    }
  );

  app.delete<{ Params: { listingId: string } }>(
    "/:listingId",
    { preHandler: [app.authenticate, requirePlan(["pro", "enterprise"])] },
    async (request, reply) => {
    const userId = resolveUserId(request);
    const { listingId } = request.params;

    const watchlist = watchlists.get(userId) ?? new Map<string, WatchlistItem>();
    if (!watchlist.has(listingId)) {
      return fail(request, reply, "NOT_FOUND", "Watchlist item not found.", 404);
    }

    watchlist.delete(listingId);
    watchlists.set(userId, watchlist);
    return ok(request, { removed: true });
    }
  );
}
