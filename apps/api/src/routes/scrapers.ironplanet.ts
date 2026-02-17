import type { FastifyInstance } from "fastify";
import { disableWritesInDemo } from "../middleware/disableWritesInDemo.js";
import { ok } from "../response.js";
import { scrapeIronPlanetSearch } from "../scrapers/ironplanet.js";
import { isValidIronPlanetUrl } from "../scrapers/ironplanet.validation.js";

type ScrapeIronPlanetQuery = {
  url?: string;
};

export default async function ironPlanetScraperRoutes(app: FastifyInstance) {
  app.get<{ Querystring: ScrapeIronPlanetQuery }>("/api/scrape/ironplanet", { preHandler: [disableWritesInDemo] }, async (request, reply) => {
    const { url } = request.query;

    if (!isValidIronPlanetUrl(url)) {
      return reply.status(400).send({
        error: {
          code: "INVALID_URL",
          message: "Invalid IronPlanet URL",
          requestId: request.requestId,
        },
      });
    }

    try {
      const summary = await scrapeIronPlanetSearch(url);
      return reply.send(ok(request, summary));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown scrape error";
      return reply.status(500).send({
        error: {
          code: "SCRAPE_FAILED",
          message: "Failed to scrape IronPlanet",
          details: {
            message,
            requestUrl: url,
          },
          requestId: request.requestId,
        },
      });
    }
  });
}
