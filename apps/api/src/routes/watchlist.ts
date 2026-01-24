import { FastifyInstance } from "fastify";
import { z } from "zod";
import { watchlists, listings, demoUserId } from "../store.js";
import { ok, fail } from "../response.js";
import { WatchlistItem } from "@easyfinderai/shared";

export default async function watchlistRoutes(app: FastifyInstance) {
  app.get("/", async (request) => {
    const watchlist = watchlists.get(demoUserId) ?? new Map<string, WatchlistItem>();
    return ok(request, { items: Array.from(watchlist.values()) });
  });

  app.post("/", async (request, reply) => {
    const listingId = z
      .object({ listingId: z.string() })
      .parse(request.body).listingId;
    if (!listings.find((listing) => listing.id === listingId)) {
      return fail(request, reply, "NOT_FOUND", "Listing not found.", 404);
    }
    const watchlist = watchlists.get(demoUserId) ?? new Map<string, WatchlistItem>();
    const item: WatchlistItem = {
      id: `${demoUserId}:${listingId}`,
      userId: demoUserId,
      listingId,
      createdAt: new Date().toISOString(),
    };
    watchlist.set(listingId, item);
    watchlists.set(demoUserId, watchlist);
    return ok(request, { item });
  });
}
