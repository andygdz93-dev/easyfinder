import type { FastifyInstance } from "fastify";
import { config } from "../config.js";

export default async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({
    ok: true,
    mongoConfigured: Boolean(config.mongoUrl && config.dbName),
  }));
}