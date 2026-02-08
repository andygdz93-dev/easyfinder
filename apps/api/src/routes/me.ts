import { FastifyInstance } from "fastify";
import { ObjectId } from "mongodb";
import { AuthUser } from "../auth.js";
import { getCollection } from "../db.js";
import { defaultBilling, normalizeBilling, serializeBilling } from "../billing.js";

type UserDocument = {
  _id: ObjectId;
  email: string;
  name: string;
  role: "buyer" | "seller" | "admin";
  ndaAcceptedAt?: Date;
  ndaVersion?: string;
  billing?: {
    stripe_customer_id?: string;
    stripe_subscription_id?: string;
    plan: "free" | "pro" | "enterprise";
    status: "active" | "past_due" | "canceled" | "incomplete";
    current_period_end: Date;
  };
};

export default async function meRoutes(app: FastifyInstance) {
  // IMPORTANT: do NOT call getCollection() until inside a try/catch
  const usersCollection = () => getCollection<UserDocument>("users");

  app.get("/", { preHandler: app.authenticate }, async (request, reply) => {
    const fallbackUser = () => {
      const currentUser = request.user as Partial<AuthUser>;
      return {
        id: currentUser.id,
        email: currentUser.email,
        name: currentUser.name,
        role: (currentUser.role as UserDocument["role"]) ?? "buyer",
        billing: serializeBilling(defaultBilling()),
      };
    };

    // If the JWT payload already has email/role, we can always return something.
    const fallback = fallbackUser();

    // If we don't even have an id, DB lookup is impossible anyway.
    if (!fallback.id || !ObjectId.isValid(fallback.id)) {
      return { data: fallback };
    }

    try {
      const col = usersCollection(); // can throw if DB not initialized
      const user = await col.findOne({ _id: new ObjectId(fallback.id) });

      if (!user) {
        return { data: fallback };
      }

      return {
        data: {
          id: user._id.toHexString(),
          email: user.email,
          name: user.name,
          role: user.role,
          billing: serializeBilling(normalizeBilling(user.billing)),
        },
      };
    } catch {
      // DB not initialized (tests) or DB down: never 500 /api/me
      return { data: fallback };
    }
  });
}
