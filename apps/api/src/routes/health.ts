import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { ok } from "../response.js";

export default async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async (request) =>
    ok(request, {
      status: "ok",
      ok: true,
      mongoConfigured: Boolean(config.mongoUrl && config.dbName),
    })
  );
}
