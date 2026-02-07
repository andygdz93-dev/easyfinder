import { ObjectId } from "mongodb";
import { getCollection } from "../db.js";

export default async function meRoutes(app: any) {
  const usersCollection = () => getCollection("users");

  app.get("/", { preHandler: app.authenticate }, async (request: any, reply: any) => {
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

    return {
      id: user._id.toHexString(),
      email: user.email,
      name: user.name,
      role: user.role,
    };
  });
}
