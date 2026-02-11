import type { FastifyInstance } from "fastify";
import { env } from "../env.js";
import { ok } from "../response.js";

export default async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async (request) =>
    ok(request, {
      ok: true,
      demoMode: env.DEMO_MODE,
      billingEnabled: env.BILLING_ENABLED,
    })
  );
}
