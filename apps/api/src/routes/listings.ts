import type { FastifyInstance } from "fastify";
import {
  demoListings,
  defaultScoringConfig,
  scoreListing,
} from "@easyfinderai/shared";
import { fail, ok } from "../response.js";

export default async function listingsRoutes(app: FastifyInstance) {
  /**
   * GET /api/listings
   * Returns ranked demo listings
   */
  app.get("/", async (request) => {
    const scored = demoListings.map((listing) => {
      const score = scoreListing(listing, defaultScoringConfig);
      return {
        ...listing,
        totalScore: score.total,
        scores: score.components,
        rationale: score.rationale,
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
   * REQUIRED for demo detail pages
   */
  app.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const { id } = request.params;

    // Demo-only safeguard
    if (!id.startsWith("demo-")) {
      return fail(request, reply, "NOT_FOUND", "Listing not found", 404);
    }

    const listing = demoListings.find((l) => l.id === id);

    if (!listing) {
      return fail(request, reply, "NOT_FOUND", "Listing not found", 404);
    }

    const score = scoreListing(listing, defaultScoringConfig);

    return ok(request, {
      ...listing,
      totalScore: score.total,
      scores: score.components,
      rationale: score.rationale,
    });
  });
}
