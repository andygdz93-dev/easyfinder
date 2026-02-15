import type { FastifyInstance } from "fastify";
import { env } from "../env.js";
import { disableWritesInDemo } from "../middleware/disableWritesInDemo.js";
import { ok } from "../response.js";
import { scrapeIronPlanetSearch } from "../scrapers/ironplanet.js";

type ScrapeIronPlanetQuery = {
  url?: string;
};

export default async function ironPlanetScraperRoutes(app: FastifyInstance) {
  app.get<{ Querystring: ScrapeIronPlanetQuery }>("/api/scrape/ironplanet", { preHandler: [disableWritesInDemo] }, async (request, reply) => {
    const { url } = request.query;

    if (!url) {
      return reply.status(400).send({ message: "Query parameter 'url' is required" });
    }

    if (env.DEMO_MODE) {
      return reply.status(403).send({
        error: {
          code: "DEMO_WRITE_DISABLED",
          message:
            "IronPlanet scraping writes are disabled while DEMO_MODE=true. Set DEMO_MODE=false to persist scraped listings.",
          requestId: request.requestId,
        },
      });
    }

    try {
      const summary = await scrapeIronPlanetSearch(url);
      return reply.send(ok(request, summary));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to scrape IronPlanet";
      return reply.status(500).send({ message });
    }
  });
}
