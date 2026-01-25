import { FastifyInstance } from "fastify";
import { z } from "zod";
import { listings, getScoringConfig } from "../store.js";
import { scoreListing } from "@easyfinderai/shared";
import type { Listing, ScoreBreakdown } from "@easyfinderai/shared";
import { ok, fail } from "../response.js";
import { demoListings } from "../demo/demoListings.js";

const querySchema = z.object({
  state: z.string().length(2).optional(),
  maxPrice: z.coerce.number().int().positive().optional(),
  maxHours: z.coerce.number().int().positive().optional(),
  operable: z.enum(["true"]).optional(),
});

const clamp = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, value));

const getConfidenceScore = (score: ScoreBreakdown) =>
  Math.round(clamp(55 + score.total * 0.45, 55, 96));

const getFlags = (listing: Listing, score: ScoreBreakdown, rankIndex: number) => {
  const flags = new Set<string>();
  if (rankIndex === 0) flags.add("Best Option");
  if (listing.hours >= 6000) flags.add("High Hours");
  if (listing.hours <= 1500) flags.add("Low Hours");
  if (listing.price >= 210000) flags.add("Premium Price");
  if (listing.price <= 90000) flags.add("Value Pick");
  if (score.components.state === 100) flags.add("Preferred State");
  return Array.from(flags);
};

const getSourceListings = () =>
  process.env.DEMO_MODE === "true" ? demoListings : listings;

export default async function listingRoutes(app: FastifyInstance) {
  app.get("/", async (request) => {
    const query = querySchema.parse(request.query);
    const demoMode = process.env.DEMO_MODE === "true";

    let filtered = getSourceListings().filter((listing) => {
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
      listings: scored.map(({ listing, score }, index) => ({
        ...listing,
        score,
        ...(demoMode
          ? {
              totalScore: score.total,
              scoreBreakdown: score.components,
              rationale: score.rationale,
              confidenceScore: getConfidenceScore(score),
              flags: getFlags(listing, score, index),
            }
          : {}),
      })),
    });
  });

  app.get("/:id", async (request, reply) => {
    const demoMode = process.env.DEMO_MODE === "true";
    const id = z.string().parse((request.params as { id: string }).id);
    const listing = getSourceListings().find((item) => item.id === id);
    if (!listing) {
      return fail(request, reply, "NOT_FOUND", "Listing not found.", 404);
    }

    const scoringConfig = getScoringConfig();
    const score = scoreListing(listing, scoringConfig);

    let rankIndex = -1;
    if (demoMode) {
      const ranked = getSourceListings()
        .filter((item) => item.operable)
        .map((item) => ({
          listing: item,
          score: scoreListing(item, scoringConfig),
        }))
        .filter(({ score }) => score.total > 0)
        .sort(
          (a, b) => b.score.total - a.score.total || a.listing.price - b.listing.price
        );
      rankIndex = ranked.findIndex((entry) => entry.listing.id === listing.id);
    }

    return ok(request, {
      ...listing,
      score,
      ...(demoMode
        ? {
            totalScore: score.total,
            scoreBreakdown: score.components,
            rationale: score.rationale,
            confidenceScore: getConfidenceScore(score),
            flags: getFlags(listing, score, rankIndex),
          }
        : {}),
    });
  });
}
