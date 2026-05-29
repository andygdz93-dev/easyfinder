/**
 * Ingest script — runs independently, no HTTP server needed.
 *
 * Usage:
 *   tsx src/scripts/ingest.ts [ironplanet-search-url]
 *
 * Default URL scrapes excavators if none provided.
 * Add to cron or GitHub Actions scheduled workflow.
 */

import { connectToDatabase, closeDatabaseConnection } from "../db.js";
import { scrapeIronPlanetSearch } from "../scrapers/ironplanet.js";
import { recalculateBenchmarks } from "../services/benchmarks.js";

const DEFAULT_URLS = [
  "https://www.ironplanet.com/for-sale/excavators",
  "https://www.ironplanet.com/for-sale/wheel-loaders",
  "https://www.ironplanet.com/for-sale/dozers",
];

const log = (msg: string) => console.log(`[ingest] ${new Date().toISOString()} ${msg}`);
const err = (msg: string, e?: unknown) =>
  console.error(`[ingest:error] ${new Date().toISOString()} ${msg}`, e ?? "");

async function run() {
  const args = process.argv.slice(2);
  const urls = args.length > 0 ? args : DEFAULT_URLS;

  log("Connecting to database...");
  await connectToDatabase();
  log("Connected.");

  let totalScraped = 0;
  let totalUpserted = 0;
  let totalModified = 0;
  let failed = 0;

  for (const url of urls) {
    log(`Scraping: ${url}`);
    try {
      const summary = await scrapeIronPlanetSearch(url);
      log(
        `Done: scraped=${summary.scraped} upserted=${summary.upserted} modified=${summary.modified} matched=${summary.matched}`
      );
      totalScraped += summary.scraped;
      totalUpserted += summary.upserted;
      totalModified += summary.modified;
    } catch (e) {
      err(`Failed scraping ${url}`, e);
      failed++;
    }
  }

  log(`Scrape complete. total_scraped=${totalScraped} upserted=${totalUpserted} modified=${totalModified} failed=${failed}`);

  log("Recalculating benchmarks...");
  try {
    const benchmarks = await recalculateBenchmarks();
    log(`Benchmarks updated for ${benchmarks.length} categories.`);
    for (const b of benchmarks) {
      log(
        `  ${b.category}: count=${b.count} medianPrice=${b.medianPrice} medianHours=${b.medianHours}`
      );
    }
  } catch (e) {
    err("Benchmark recalculation failed", e);
  }

  await closeDatabaseConnection();
  log("Done. Exiting.");
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  err("Fatal error", e);
  process.exit(1);
});
