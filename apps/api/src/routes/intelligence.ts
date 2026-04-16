import { FastifyInstance } from "fastify";
import { evaluateDeal } from "../lib/engineBridge.js";

export default async function intelligenceRoutes(app: FastifyInstance) {

  // ✅ Deal evaluation endpoint
  app.post("/evaluate", async (request, reply) => {
    try {
      const result = await evaluateDeal(request.body);
      return result;
    } catch (err) {
      app.log.error(err);
      reply.status(500).send({ error: "Engine failure" });
    }
  });

}
