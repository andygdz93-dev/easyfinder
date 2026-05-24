import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { scoreListingV2, defaultScoringConfig } from "@easyfinderai/shared";
import { ok, fail } from "../response.js";

const dealInputSchema = z.object({
  id: z.string().default("eval"),
  title: z.string(),
  description: z.string().default(""),
  state: z.string().default(""),
  price: z.number().nullable().optional(),
  hours: z.number().nullable().optional(),
  operable: z.boolean().default(true),
  is_operable: z.boolean().optional(),
  year: z.number().optional(),
  condition: z.number().optional(),
  sellerType: z.enum(["dealer", "auction", "private", "unknown"]).optional(),
  shippingAvailable: z.boolean().optional(),
  availability: z.enum(["in_stock", "scheduled_auction", "unknown"]).optional(),
  lastSeenAt: z.string().optional(),
  listingUpdatedAt: z.string().optional(),
  photoCount: z.number().optional(),
  hasInspectionReport: z.boolean().optional(),
  hasServiceHistory: z.boolean().optional(),
  verifiedSeller: z.boolean().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  category: z.string().default("unknown"),
  imageUrl: z.string().optional(),
  images: z.array(z.string()).default([]),
  source: z.string().default("manual"),
  createdAt: z.string().default(() => new Date().toISOString()),
});

const getRecommendation = (total: number): "BUY" | "NEGOTIATE" | "WALK" => {
  if (total >= 65) return "BUY";
  if (total >= 45) return "NEGOTIATE";
  return "WALK";
};

export default async function dealRoutes(app: FastifyInstance) {
  app.post<{ Body: z.infer<typeof dealInputSchema> }>(
    "/evaluate",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      let payload: z.infer<typeof dealInputSchema>;
      try {
        payload = dealInputSchema.parse(request.body);
      } catch (err) {
        return fail(request, reply, "BAD_REQUEST", "Invalid listing input.", 400);
      }

      const listing = {
        ...payload,
        price: payload.price ?? null,
        hours: payload.hours ?? null,
        images: payload.images.length >= 5
          ? payload.images
          : [...payload.images, ...Array(5 - payload.images.length).fill("/demo-images/placeholder.jpg")],
      };

      const score = scoreListingV2(listing as any, defaultScoringConfig);
      const recommendation = getRecommendation(score.total ?? 0);

      return reply.send(
        ok(request, {
          recommendation,
          score,
        })
      );
    }
  );
}