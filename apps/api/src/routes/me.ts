import { FastifyInstance } from "fastify";
import { ObjectId } from "mongodb";
import { AuthUser } from "../auth.js";
import { getCollection } from "../db.js";

type UserDocument = {
  _id: ObjectId;
  email: string;
  name: string;
  role: "buyer" | "seller" | "admin";
};

export default async function meRoutes(app: FastifyInstance) {
  const usersCollection = () => getCollection<UserDocument>("users");

  app.get("/", { preHandler: app.authenticate }, async (request, reply) => {
    const fallbackUser = () => {
      const currentUser = request.user as Partial<AuthUser>;
      const response: Partial<AuthUser> = {};

      if (currentUser.id) {
        response.id = currentUser.id;
      }
      if (currentUser.email) {
        response.email = currentUser.email;
      }
      if (currentUser.name) {
        response.name = currentUser.name;
      }
      if (currentUser.role) {
        response.role = currentUser.role;
      }

      return response;
    };

    try {
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
    } catch (error) {
      return fallbackUser();
    }
  });
}
