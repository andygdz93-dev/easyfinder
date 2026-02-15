import type { FastifyInstance } from "fastify";
import { scrapeIronPlanetSearch } from "../scrapers/ironplanet.js";

type ScrapeIronPlanetQuery = {
  url?: string;
};

export default async function ironPlanetScraperRoutes(app: FastifyInstance) {
  app.get<{ Querystring: ScrapeIronPlanetQuery }>("/api/scrape/ironplanet", async (request, reply) => {
    const { url } = request.query;

    if (!url) {
      return reply.status(400).send({ message: "Query parameter 'url' is required" });
    }

    try {
      const listings = await scrapeIronPlanetSearch(url);
      return reply.send({
        count: listings.length,
        data: listings,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to scrape IronPlanet";
      return reply.status(500).send({ message });
    }
  });
}
