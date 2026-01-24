import { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { ok } from "../response.js";

export default async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async (request) => {
    const db = Boolean(config.databaseUrl);
    return ok(request, {
      status: "ok",
      db,
      version: "0.1.0",
      time: new Date().toISOString(),
    });
  });
}
