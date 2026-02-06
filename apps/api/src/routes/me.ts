import { FastifyInstance } from "fastify";
import { ObjectId } from "mongodb";
import { getCollection } from "../db.js";

type UserDocument = {
  _id: ObjectId;
  email: string;
  name: string;
  role: "buyer" | "seller" | "admin";
};

export default async function meRoutes(app: FastifyInstance) {
  const usersCollection = () => getCollection<UserDocument>("users");

  app.get("/me", { preHandler: app.authenticate }, async (request, reply) => {
    const col = usersCollection();
    if (!ObjectId.isValid(request.user.id)) {
      reply.status(404);
      return { error: { code: "NOT_FOUND", message: "User not found." } };
    }
    const user = await col.findOne({ _id: new ObjectId(request.user.id) });
    if (!user) {
      reply.status(404);
      return { error: { code: "NOT_FOUND", message: "User not found." } };
    }
    return { id: user._id.toHexString(), email: user.email, name: user.name, role: user.role };
  });
}
