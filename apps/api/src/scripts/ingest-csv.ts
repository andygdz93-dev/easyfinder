/**
 * CSV Ingest Script
 *
 * Usage:
 *   pnpm run ingest-csv /path/to/listings.csv
 *
 * CSV format (header row required):
 *   title, price, hours, year, state, category, source_url, seller_type, description
 *
 * Optional: city, condition, shipping_available, has_inspection_report, has_service_history, verified_seller, image_url
 */

import { connectToDatabase, closeDatabaseConnection } from "../db.js";
import { runCsvImportIngestion } from "../services/ingestion/csv-import.js";
import { recalculateBenchmarks } from "../services/benchmarks.js";

const log = (msg: string) => console.log(`[ingest-csv] ${new Date().toISOString()} ${msg}`);
const err = (msg: string, e?: unknown) => console.error(`[ingest-csv:error] ${new Date().toISOString()} ${msg}`, e ?? "");

async function run() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: tsx src/scripts/ingest-csv.ts <path-to-csv>");
    process.exit(1);
  }

  log("Connecting to database...");
  await connectToDatabase();
  log("Connected.");

  log(`Importing CSV: ${filePath}`);
  try {
    const result = await runCsvImportIngestion(filePath);
    log(`Import complete: total=${result.total} upserted=${result.upserted} modified=${result.modified} skipped=${result.skipped}`);
    if (result.errors.length > 0) {
      log(`Errors (${result.errors.length}):`);
      for (const e of result.errors) {
        err(e);
      }
    }
  } catch (e) {
    err("Import failed", e);
    await closeDatabaseConnection();
    process.exit(1);
  }

  log("Recalculating benchmarks...");
  try {
    const benchmarks = await recalculateBenchmarks();
    log(`Benchmarks updated for ${benchmarks.length} categories.`);
    for (const b of benchmarks) {
      log(`  ${b.category}: count=${b.count} medianPrice=${b.medianPrice} medianHours=${b.medianHours}`);
    }
  } catch (e) {
    err("Benchmark recalculation failed", e);
  }

  await closeDatabaseConnection();
  log("Done.");
  process.exit(0);
}

run().catch((e) => {
  err("Fatal", e);
  process.exit(1);
});
