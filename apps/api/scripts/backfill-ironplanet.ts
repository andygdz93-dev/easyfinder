import "dotenv/config";

import pLimit from "p-limit";
import { closeDatabaseConnection, connectToDatabase, getCollection } from "../src/db.js";
import { getListingsCollection, type ListingDocument } from "../src/listings.js";
import { scrapeIronPlanetDetail } from "../src/scrapers/ironplanet.js";

const ALLOW_PRODUCTION_FLAG = "--allow-production";
const DEFAULT_LIMIT = 200;
const UPSERT_BATCH_SIZE = 25;
const CONCURRENCY = 3;

type ParsedArgs = {
  limit: number;
  all: boolean;
  dryRun: boolean;
  allowProduction: boolean;
};

const usage =
  "Usage: pnpm --filter @easyfinderai/api backfill-ironplanet -- [--limit 200] [--all] [--dry-run] [--allow-production]";

const parseArgs = (argv: string[]): ParsedArgs => {
  let limit = DEFAULT_LIMIT;
  let all = false;
  let dryRun = true;
  let allowProduction = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--") continue;

    if (arg === "--limit") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for --limit.\n${usage}`);
      }
      const parsed = Number.parseInt(value, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`Invalid --limit value: ${value}.\n${usage}`);
      }
      limit = parsed;
      i += 1;
      continue;
    }

    if (arg.startsWith("--limit=")) {
      const value = arg.slice("--limit=".length);
      const parsed = Number.parseInt(value, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`Invalid --limit value: ${value}.\n${usage}`);
      }
      limit = parsed;
      continue;
    }

    if (arg === "--all") {
      all = true;
      continue;
    }

    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (arg === "--no-dry-run") {
      dryRun = false;
      continue;
    }

    if (arg === ALLOW_PRODUCTION_FLAG) {
      allowProduction = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      console.log(usage);
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}\n${usage}`);
  }

  return { limit, all, dryRun, allowProduction };
};

const JUNK_INDICATORS = ["n_images", "/images/", "logo", "avatar", "ritchielist", ".gif"];

const isMissingNumber = (value: unknown): boolean => typeof value !== "number" || Number.isNaN(value);

const hasJunkImage = (value: unknown): boolean => {
  if (typeof value !== "string") return false;
  const lower = value.toLowerCase();
  return JUNK_INDICATORS.some((token) => lower.includes(token));
};

const isSuspectListing = (listing: ListingDocument): boolean => {
  if (isMissingNumber(listing.price) || (listing.price ?? 0) <= 1) return true;
  if (isMissingNumber(listing.hours) || (listing.hours ?? 0) < 100) return true;
  if (typeof listing.description === "string" && listing.description.includes("<")) return true;
  if (hasJunkImage(listing.imageUrl)) return true;
  if (Array.isArray(listing.images) && listing.images.some((image) => hasJunkImage(image))) return true;
  return false;
};

const formatNumber = (value: number | null | undefined): string => {
  if (typeof value !== "number" || Number.isNaN(value)) return "null";
  return value.toString();
};

const diffSummary = (before: ListingDocument, after: ListingDocument): string => {
  const beforeDescLength = typeof before.description === "string" ? before.description.length : 0;
  const afterDescLength = typeof after.description === "string" ? after.description.length : 0;

  return [
    `price: ${formatNumber(before.price)} -> ${formatNumber(after.price)}`,
    `hours: ${formatNumber(before.hours)} -> ${formatNumber(after.hours)}`,
    `imageUrl: ${(before.imageUrl ?? "").slice(0, 90)} -> ${(after.imageUrl ?? "").slice(0, 90)}`,
    `descriptionLength: ${beforeDescLength} -> ${afterDescLength}`,
  ].join(" | ");
};

const chunk = <T>(items: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));

  if (process.env.NODE_ENV === "production" && !args.allowProduction) {
    throw new Error(
      `Refusing to run in production without ${ALLOW_PRODUCTION_FLAG}.\n` +
        `If you intentionally need this, run again with ${ALLOW_PRODUCTION_FLAG}.`
    );
  }

  await connectToDatabase();

  try {
    const listingsCollection = getCollection<ListingDocument>("listings");
    const query: Record<string, unknown> = {
      source: "ironplanet",
      sourceUrl: { $exists: true, $type: "string", $ne: "" },
      sourceExternalId: { $exists: true, $type: "string", $ne: "" },
    };

    if (!args.all) {
      query.$or = [
        { price: { $exists: false } },
        { price: null },
        { price: { $lte: 1 } },
        { hours: { $exists: false } },
        { hours: null },
        { hours: { $lt: 100 } },
        { description: { $regex: "<" } },
        { imageUrl: { $regex: "(n_images|/images/|logo|avatar|ritchielist|\\.gif)", $options: "i" } },
        { images: { $elemMatch: { $regex: "(n_images|/images/|logo|avatar|ritchielist|\\.gif)", $options: "i" } } },
      ];
    }

    const docs = await listingsCollection
      .find(query)
      .sort({ updatedAt: -1 })
      .limit(args.limit)
      .toArray();

    const candidates = args.all ? docs : docs.filter(isSuspectListing);

    console.log(
      `[backfill-ironplanet] dryRun=${args.dryRun} all=${args.all} limit=${args.limit} candidates=${candidates.length}`
    );

    const limit = pLimit(CONCURRENCY);
    let processed = 0;
    let skipped = 0;
    let updated = 0;
    let failures = 0;
    const upserts: ListingDocument[] = [];

    await Promise.all(
      candidates.map((doc) =>
        limit(async () => {
          if (!doc.sourceUrl || !doc.sourceExternalId) {
            skipped += 1;
            return;
          }

          try {
            const scraped = await scrapeIronPlanetDetail(doc.sourceUrl);
            processed += 1;

            if (!scraped) {
              failures += 1;
              console.error(`[backfill-ironplanet] failed to scrape ${doc.sourceUrl}`);
              return;
            }

            if (args.dryRun) {
              console.log(`[dry-run] ${doc.sourceExternalId} ${diffSummary(doc, scraped)}`);
              updated += 1;
              return;
            }

            upserts.push(scraped);
          } catch (error) {
            failures += 1;
            const message = error instanceof Error ? error.message : String(error);
            console.error(`[backfill-ironplanet] ${doc.sourceExternalId} ${message}`);
          }
        })
      )
    );

    if (!args.dryRun && upserts.length > 0) {
      const listings = getListingsCollection();
      for (const batch of chunk(upserts, UPSERT_BATCH_SIZE)) {
        const result = await listings.upsertManyBySourceExternalId("ironplanet", batch);
        updated += result.upserted + result.modified + result.matched;
      }
    }

    console.log("[backfill-ironplanet] complete");
    console.log(`processed=${processed}`);
    console.log(`skipped=${skipped}`);
    console.log(`updated=${updated}`);
    console.log(`failures=${failures}`);
  } finally {
    await closeDatabaseConnection();
  }
};

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
