import { FastifyInstance } from "fastify";
import { getUserById } from "../auth.js";

export default async function meRoutes(app: FastifyInstance) {
  app.get("/me", { preHandler: app.authenticate }, async (request, reply) => {
    const user = getUserById(request.user.id);
    if (!user) {
      reply.status(404);
      return { error: { code: "NOT_FOUND", message: "User not found." } };
    }
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  });
}