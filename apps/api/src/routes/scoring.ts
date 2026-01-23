import { FastifyInstance } from "fastify";
import { z } from "zod";
import { nanoid } from "nanoid";
import { getScoringConfig, setScoringConfig } from "../store";
import { ok, fail } from "../response";

const scoringConfigInput = z.object({
  name: z.string(),
  weights: z.object({
    hours: z.number(),
    price: z.number(),
    state: z.number(),
  }),
  preferredStates: z.array(z.string()),
  maxHours: z.number(),
  maxPrice: z.number(),
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
