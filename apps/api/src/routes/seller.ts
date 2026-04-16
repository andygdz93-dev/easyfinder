import { FastifyInstance } from "fastify";
import { ok, fail } from "../response.js";

const sellerOnly = new Set(["seller"]);

export default async function sellerRoutes(app: FastifyInstance) {
  // GET /api/seller/insights — seller dashboard
  app.get("/insights", { preHandler: app.authenticate }, async (request, reply) => {
    if (!sellerOnly.has(request.user.role)) {
      return fail(request, reply, "FORBIDDEN", "Seller access only.", 403);
    }

    // TODO: aggregate seller metrics (listings, scores, pricing trends, etc.)
    return ok(request, {
      sellerId: request.user.id,
      message: "Seller insights endpoint — implementation pending",
    });
  });
}
