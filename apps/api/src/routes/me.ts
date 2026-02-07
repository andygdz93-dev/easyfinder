import { FastifyInstance } from "fastify";
import { ObjectId } from "mongodb";
import { fail, ok } from "../response.js";
import { getUsersCollection } from "../users.js";

export default async function meRoutes(app: FastifyInstance) {
  const usersCollection = () => getUsersCollection();

  app.get("/", { preHandler: app.authenticate }, async (request, reply) => {
    const col = usersCollection();
    if (!ObjectId.isValid(request.user.id)) {
      return fail(request, reply, "NOT_FOUND", "User not found.", 404);
    }
    const user = await col.findOne({ _id: new ObjectId(request.user.id) });
    if (!user) {
      return fail(request, reply, "NOT_FOUND", "User not found.", 404);
    }
    return ok(request, {
      id: user._id.toHexString(),
      email: user.email,
      name: user.name,
      role: user.role,
    });
  });
}
