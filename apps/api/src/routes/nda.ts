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
  const usersCollection = getCollection<UserDocument>("users");

  app.get("/status", { preHandler: app.authenticate }, async (request, reply) => {
    if (!ObjectId.isValid(request.user.id)) {
      return fail(request, reply, "NOT_FOUND", "User not found.", 404);
    }

    const user = await usersCollection.findOne({ _id: new ObjectId(request.user.id) });
    if (!user) {
      return fail(request, reply, "NOT_FOUND", "User not found.", 404);
    }

    const acceptedAt = user.ndaAcceptedAt ? user.ndaAcceptedAt.toISOString() : undefined;
    return ok(request, {
      accepted: Boolean(user.ndaAcceptedAt),
      acceptedAt,
      ndaVersion: user.ndaVersion,
    });
  });

  app.post("/accept", { preHandler: app.authenticate }, async (request, reply) => {
    acceptSchema.parse(request.body);

    if (!ObjectId.isValid(request.user.id)) {
      return fail(request, reply, "NOT_FOUND", "User not found.", 404);
    }

    const now = new Date();
    const updateResult = await usersCollection.updateOne(
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

    return ok(request, {
      accepted: true,
      acceptedAt: now.toISOString(),
      ndaVersion: "v1",
    });
  });
}
