import { FastifyInstance } from "fastify";
import { fail } from "../response.js";
import { requireNDA } from "../middleware/requireNDA.js";
import { disableWritesInDemo } from "../middleware/disableWritesInDemo.js";
import { audit } from "../lib/audit.js";

export default async function offersRoutes(app: FastifyInstance) {
  app.post(
    "/",
    { preHandler: [app.authenticate, requireNDA, disableWritesInDemo] },
    async (request, reply) => {
      audit("OFFER_SUBMITTED", {
        userId: request.user.id,
      });

      return fail(request, reply, "NOT_IMPLEMENTED", "Offer creation is not available yet.", 501);
    }
  );
}
