import { FastifyInstance } from "fastify";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { getCollection } from "../db.js";
import { fail, ok } from "../response.js";

type UserDocument = {
  _id: ObjectId;
  ndaAcceptedAt?: Date;
  ndaVersion?: string;
};

const acceptSchema = z.object({
  accepted: z.literal(true),
});

export default async function ndaRoutes(app: FastifyInstance) {
  const usersCollection = () => getCollection<UserDocument>("users");

  app.get("/status", { preHandler: app.authenticate }, async (request, reply) => {
    try {
      const col = usersCollection();
      if (!ObjectId.isValid(request.user.id)) {
        return ok(request, { accepted: false });
      }

      const user = await col.findOne({ _id: new ObjectId(request.user.id) });
      if (!user) {
        return ok(request, { accepted: false });
      }

      return ok(request, {
        accepted: Boolean(user.ndaAcceptedAt),
      });
    } catch {
      return ok(request, { accepted: false });
    }
  });

  app.post("/accept", { preHandler: app.authenticate }, async (request, reply) => {
    const col = usersCollection();
    acceptSchema.parse(request.body);

    if (!ObjectId.isValid(request.user.id)) {
      return fail(request, reply, "NOT_FOUND", "User not found.", 404);
    }

    const now = new Date();
    const updateResult = await col.updateOne(
      { _id: new ObjectId(request.user.id) },
      {
        $set: {
          ndaAcceptedAt: now,
          ndaVersion: "v1",
        },
      }
    );

    if (!updateResult.matchedCount) {
      return fail(request, reply, "NOT_FOUND", "User not found.", 404);
    }

    return ok(request, { accepted: true });
  });
}
