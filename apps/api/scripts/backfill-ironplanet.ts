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

type BackfillPatch = Pick<ListingDocument, "price" | "hours" | "description" | "imageUrl" | "images">;
type ListingPatch = Partial<BackfillPatch>;

const diffSummary = (before: ListingDocument, patch: ListingPatch): string => {
  const beforeDescLength = typeof before.description === "string" ? before.description.length : 0;
  const afterDescription = patch.description ?? before.description;
  const afterDescLength = typeof afterDescription === "string" ? afterDescription.length : 0;
  const afterImageUrl = patch.imageUrl ?? before.imageUrl;

  return [
    patch.price !== undefined ? `price: ${formatNumber(before.price)} -> ${formatNumber(patch.price)}` : null,
    patch.hours !== undefined ? `hours: ${formatNumber(before.hours)} -> ${formatNumber(patch.hours)}` : null,
    patch.imageUrl !== undefined
      ? `imageUrl: ${(before.imageUrl ?? "").slice(0, 90)} -> ${(afterImageUrl ?? "").slice(0, 90)}`
      : null,
    patch.description !== undefined ? `descriptionLength: ${beforeDescLength} -> ${afterDescLength}` : null,
    patch.images !== undefined
      ? `images: ${(before.images ?? []).length} -> ${(patch.images ?? []).length}`
      : null,
  ]
    .filter((entry): entry is string => Boolean(entry))
    .join(" | ");
};

const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

const isValidDescription = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0 && !value.includes("<");

const isValidImageUrl = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0 && !hasJunkImage(value);

const hasAnyFields = (patch: ListingPatch): boolean => Object.keys(patch).length > 0;

const buildPatch = (existing: ListingDocument, scraped: ListingDocument): ListingPatch => {
  const patch: ListingPatch = {};

  if (isFiniteNumber(scraped.price) && scraped.price >= 100 && scraped.price !== 0) {
    if (!isFiniteNumber(existing.price) || existing.price <= 1) {
      patch.price = scraped.price;
    }
  }

  if (isFiniteNumber(scraped.hours) && scraped.hours >= 100 && scraped.hours !== 0) {
    if (!isFiniteNumber(existing.hours) || existing.hours < 100) {
      patch.hours = scraped.hours;
    }
  }

  if (isValidDescription(scraped.description)) {
    if (!isValidDescription(existing.description)) {
      patch.description = scraped.description;
    }
  }

  if (isValidImageUrl(scraped.imageUrl)) {
    const existingHasValidImage = isValidImageUrl(existing.imageUrl);
    const scrapedImages = Array.isArray(scraped.images)
      ? scraped.images.filter((image): image is string => isValidImageUrl(image))
      : [];

    if (!existingHasValidImage || hasJunkImage(existing.imageUrl)) {
      patch.imageUrl = scraped.imageUrl;
    }

    const existingImages = Array.isArray(existing.images)
      ? existing.images.filter((image): image is string => isValidImageUrl(image))
      : [];

    if (scrapedImages.length > 0 && (existingImages.length === 0 || (Array.isArray(existing.images) && existing.images.some((image) => hasJunkImage(image))))) {
      patch.images = scrapedImages;
    }
  }

  return patch;
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
    let noop = 0;
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

            const patch = buildPatch(doc, scraped);
            if (!hasAnyFields(patch)) {
              noop += 1;
              return;
            }

            const mergedDoc: ListingDocument = {
              ...doc,
              ...patch,
              source: "ironplanet",
              sourceExternalId: doc.sourceExternalId,
              sourceUrl: doc.sourceUrl,
            };

            if (args.dryRun) {
              console.log(`[dry-run] ${doc.sourceExternalId} ${diffSummary(doc, patch)}`);
              updated += 1;
              return;
            }

            upserts.push(mergedDoc);
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
    console.log(`noop=${noop}`);
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
