import type { FastifyInstance } from "fastify";
import {
  demoListings,
  defaultScoringConfig,
  scoreListing,
} from "@easyfinderai/shared";

export default async function listingsRoutes(app: FastifyInstance) {
  /**
   * GET /api/listings
   * Returns ranked demo listings
   */
  app.get("/", async () => {
    const scored = demoListings.map((listing) => {
      const score = scoreListing(listing, defaultScoringConfig);
      return {
        ...listing,
        totalScore: score.total,
        scores: score.components,
        rationale: score.rationale,
      };
    });

    return scored.sort((a, b) => {
      const scoreDiff = (b.totalScore ?? 0) - (a.totalScore ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      return (a.price ?? 0) - (b.price ?? 0);
    });
  });

  /**
   * GET /api/listings/:id
   * REQUIRED for demo detail pages
   */
  app.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
      const { id } = request.params;

      // Demo-only safeguard
      if (!id.startsWith("demo-")) {
        return reply.code(404).send({
          ok: false,
          error: {
            code: "NOT_FOUND",
            message: "Listing not found",
          },
        });
      }

      const listing = demoListings.find((l) => l.id === id);

      if (!listing) {
        return reply.code(404).send({
          ok: false,
          error: {
            code: "NOT_FOUND",
            message: "Listing not found",
          },
        });
      }

      const score = scoreListing(listing, defaultScoringConfig);

      return {
        ...listing,
        totalScore: score.total,
        scores: score.components,
        rationale: score.rationale,
      };
    }
  );
}
