import type { FastifyInstance } from "fastify";
import { defaultScoringConfig, scoreListing } from "@easyfinderai/shared";
import { fail, ok } from "../response.js";
import { getListingsCollection } from "../listings.js";
import { requireNDA } from "../middleware/requireNDA.js";
import { config } from "../config.js";
import { disableWritesInDemo } from "../middleware/disableWritesInDemo.js";
import { audit } from "../lib/audit.js";
import { env } from "../env.js";


const apiBaseUrl = env.PUBLIC_API_BASE_URL.replace(/\/+$/, "");

const toAbsoluteImageUrl = (url: string): string => {
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${apiBaseUrl}${url}`;
  return `${apiBaseUrl}/${url}`;
};

const normalizeListingImagesForResponse = <T extends { imageUrl?: string; images?: string[] }>(listing: T): T => {
  const deduped = Array.from(
    new Set([listing.imageUrl, ...(listing.images ?? [])].filter((value): value is string => Boolean(value)))
  )
    .slice(0, 5)
    .map((url) => toAbsoluteImageUrl(url));

  if (deduped.length === 0) {
    const placeholder = toAbsoluteImageUrl("/demo-images/other/1.jpg");
    return {
      ...listing,
      imageUrl: placeholder,
      images: Array(5).fill(placeholder),
    };
  }

  const hero = deduped[0];
  while (deduped.length < 5) {
    deduped.push(hero);
  }

  return {
    ...listing,
    imageUrl: hero,
    images: deduped,
  };
};

export default async function listingsRoutes(app: FastifyInstance) {
  /**
   * GET /api/listings
   * Returns ranked live listings
   */
  app.get("/", { preHandler: [app.authenticate, requireNDA] }, async (request, reply) => {
    if (config.demoMode && process.env.NODE_ENV !== "test") {
      return fail(
        request,
        reply,
        "DEMO_MODE_ACTIVE",
        "LIVE listings are disabled while DEMO_MODE is enabled.",
        503
      );
    }

    reply.header("Cache-Control", "no-store");

    const activeListings = await getListingsCollection().findLiveListings();

    const scored = activeListings.map((listing) => {
      const score = scoreListing({ ...listing, createdAt: listing.createdAt ?? new Date(0).toISOString() }, defaultScoringConfig);
      return {
        ...normalizeListingImagesForResponse(listing),
        totalScore: score.total,
        scoreV2: score.scoreV2,
        confidenceScore: score.confidenceScore,
        reasons: score.reasons,
        flags: score.flags,
        bestOptionEligible: score.bestOptionEligible,
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
    { preHandler: [app.authenticate, requireNDA] },
    async (request, reply) => {
    const { id } = request.params;

    if (config.demoMode && process.env.NODE_ENV !== "test") {
      return fail(
        request,
        reply,
        "DEMO_MODE_ACTIVE",
        "LIVE listings are disabled while DEMO_MODE is enabled.",
        503
      );
    }

    reply.header("Cache-Control", "no-store");

    const listing = await getListingsCollection().findLiveListingById(id);

    if (!listing) {
      return fail(request, reply, "NOT_FOUND", "Listing not found", 404);
    }

    const score = scoreListing({ ...listing, createdAt: listing.createdAt ?? new Date(0).toISOString() }, defaultScoringConfig);

    return ok(request, {
      ...normalizeListingImagesForResponse(listing),
      totalScore: score.total,
      scoreV2: score.scoreV2,
      confidenceScore: score.confidenceScore,
      reasons: score.reasons,
      flags: score.flags,
      bestOptionEligible: score.bestOptionEligible,
      score,
    });
    }
  );

  const writeHandlers = {
    preHandler: [app.authenticate, requireNDA, disableWritesInDemo],
  };

  app.post("/", writeHandlers, async (request, reply) => {
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
