import { FastifyInstance } from "fastify";
import { evaluateDeal } from "../lib/dealEngine.js";
import { getListingsCollection } from "../listings.js";
import { verifyToken } from "../lib/verifyHmac.js";

export default async function dealRoutes(app: FastifyInstance) {
  app.post("/evaluate", async (req, reply) => {
    try {
      const input = req.body as any;

      if (!input?.listing_id || !input?.asking_price || !input?.category) {
        return reply.status(400).send({
          error: "Missing required fields: listing_id, asking_price, category",
        });
      }

      // HMAC anti-cheat (optional header)
      const token = req.headers["x-hmac-token"] as string | undefined;
      if (token) {
        const payload = `${input.listing_id}:${input.asking_price}`;
        if (!verifyToken(payload, token)) {
          return reply.status(401).send({ error: "Invalid HMAC token" });
        }
      }

      // Enrich from DB if market_p50 not supplied
      if (!input.market_p50) {
        const listing = await getListingsCollection().findById(input.listing_id);
        if (listing) {
          if ((listing as any).marketValue && !input.market_p50) {
            input.market_p50 = (listing as any).marketValue;
          }
          if (listing.hours != null && !input.hours) {
            input.hours = listing.hours;
          }
        }
      }

      return reply.send({ data: evaluateDeal(input) });
    } catch (e: any) {
      app.log.error(e, "deal/evaluate error");
      return reply.status(500).send({ error: "Deal engine error", detail: e.message });
    }
  });

  app.get("/health", async (_req, reply) =>
    reply.send({ status: "ok", engine: "dealEngine.ts", version: "1.0.0" })
  );
}
