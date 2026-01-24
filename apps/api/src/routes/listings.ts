import { FastifyInstance } from "fastify";
import { z } from "zod";
import { listings, getScoringConfig } from "../store.js";
import { scoreListing } from "@easyfinderai/shared";
import { ok, fail } from "../response.js";

const querySchema = z.object({
  state: z.string().length(2).optional(),
  maxPrice: z.coerce.number().int().positive().optional(),
  maxHours: z.coerce.number().int().positive().optional(),
  operable: z.enum(["true"]).optional(),
});

export default async function listingRoutes(app: FastifyInstance) {
  app.get("/", async (request) => {
    const query = querySchema.parse(request.query);

    let filtered = listings.filter((listing) => {
      if (!listing.operable) return false;
      if (query.operable && query.operable !== "true") return false;
      if (query.state && listing.state !== query.state) return false;
      if (query.maxPrice && listing.price > query.maxPrice) return false;
      if (query.maxHours && listing.hours > query.maxHours) return false;
      return true;
    });

    const scoringConfig = getScoringConfig();
    const scored = filtered
      .map((listing) => ({
        listing,
        score: scoreListing(listing, scoringConfig),
      }))
      .filter(({ score }) => score.total > 0)
      .sort(
        (a, b) => b.score.total - a.score.total || a.listing.price - b.listing.price
      );

    return ok(request, {
      total: scored.length,
      listings: scored.map(({ listing, score }) => ({
        ...listing,
        score,
      })),
    });
  });

  app.get("/:id", async (request, reply) => {
    const id = z.string().parse((request.params as { id: string }).id);
    const listing = listings.find((item) => item.id === id);
    if (!listing) {
      return fail(request, reply, "NOT_FOUND", "Listing not found.", 404);
    }

    const score = scoreListing(listing, getScoringConfig());

    return ok(request, { ...listing, score });
  });
}
