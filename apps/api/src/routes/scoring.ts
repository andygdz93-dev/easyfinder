import { FastifyInstance } from "fastify";
import { z } from "zod";
import { nanoid } from "nanoid";
import { getScoringConfig, setScoringConfig } from "../store.js";
import { ok, fail } from "../response.js";

const scoringConfigInput = z.object({
  name: z.string(),
  weights: z.object({
    price: z.number(),
    hours: z.number(),
    year: z.number(),
    location: z.number(),
    condition: z.number(),
    completeness: z.number(),
  }),
  preferredStates: z.array(z.string()),
  minHours: z.number(),
  maxHours: z.number(),
  minPrice: z.number(),
  maxPrice: z.number(),
  minYear: z.number(),
  maxYear: z.number(),
  minCondition: z.number(),
  maxCondition: z.number(),
});

export default async function scoringRoutes(app: FastifyInstance) {
  app.get("/", async (request) => ok(request, { config: getScoringConfig() }));

  app.post("/", { preHandler: app.authenticate }, async (request, reply) => {
    const role = request.user?.role ?? "demo";
    if (role !== "buyer" && role !== "admin") {
      return fail(request, reply, "FORBIDDEN", "Buyer access only.", 403);
    }

    const payload = scoringConfigInput.parse(request.body);
    const next = {
      id: nanoid(),
      ...payload,
      active: true,
    };
    setScoringConfig(next);
    return ok(request, { config: next });
  });
}
