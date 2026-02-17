import pLimit from "p-limit";
import type { Filter } from "mongodb";
import { closeDatabaseConnection, connectToDatabase, getCollection } from "../db.js";
import { env } from "../env.js";
import { type ListingDocument, getListingsCollection } from "../listings.js";
import { scrapeIronPlanetDetail } from "../scrapers/ironplanet.js";

type BackfillArgs = {
  dryRun: boolean;
  limit: number;
  all: boolean;
  allowProduction: boolean;
};

type ListingDbDoc = ListingDocument & { _id?: unknown };

const USAGE =
  "Usage: pnpm --filter @easyfinderai/api backfill-ironplanet -- [--dry-run|--no-dry-run|--write] [--limit N] [--all] [--allow-production]";
const DEFAULT_LIMIT = 200;
const CONCURRENCY = 3;
const BATCH_SIZE = 50;

const JUNK_IMAGE_REGEX = /\/n_images\/|avatar|ritchielist|logo|placeholder|sprite|blank|icon|\.gif$/i;

const parseArgs = (argv: string[]): BackfillArgs => {
  const parsed: BackfillArgs = {
    dryRun: true,
    limit: DEFAULT_LIMIT,
    all: false,
    allowProduction: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--dry-run") {
      parsed.dryRun = true;
      continue;
    }

    if (arg === "--no-dry-run" || arg === "--write") {
      parsed.dryRun = false;
      continue;
    }

    if (arg === "--all") {
      parsed.all = true;
      continue;
    }

    if (arg === "--allow-production") {
      parsed.allowProduction = true;
      continue;
    }

    if (arg === "--limit") {
      const next = argv[i + 1];
      if (!next) {
        throw new Error(`Missing value for --limit. ${USAGE}`);
      }

      const limit = Number(next);
      if (!Number.isFinite(limit) || limit <= 0) {
        throw new Error(`Invalid --limit value: ${next}. ${USAGE}`);
      }

      parsed.limit = Math.floor(limit);
      i += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}. ${USAGE}`);
  }

  return parsed;
};

const isValidImage = (url: string): boolean => url.trim().length > 0 && !JUNK_IMAGE_REGEX.test(url.trim().toLowerCase());

const sanitizeImages = (images: unknown): string[] => {
  if (!Array.isArray(images)) return [];

  const unique = new Set<string>();
  for (const image of images) {
    if (typeof image !== "string") continue;
    const trimmed = image.trim();
    if (!isValidImage(trimmed)) continue;
    unique.add(trimmed);
    if (unique.size >= 5) break;
  }

  return Array.from(unique);
};

const buildSuspectFilter = (): Filter<ListingDbDoc> => ({
  source: "ironplanet",
  $or: [
    { price: { $exists: false } },
    { price: null },
    { price: 0 },
    { price: { $lte: 1 } },
    { price: { $lt: 100 } },
    { hours: { $exists: false } },
    { hours: null },
    { hours: { $lt: 100 } },
    { description: { $regex: /</ } },
    { imageUrl: { $exists: false } },
    { imageUrl: "" },
    { imageUrl: { $regex: JUNK_IMAGE_REGEX } },
    { images: { $elemMatch: { $regex: JUNK_IMAGE_REGEX } } },
  ],
});

const toDiff = (before: ListingDbDoc, after: ListingDbDoc): string => {
  const fields: Array<keyof ListingDocument> = ["price", "hours", "description", "imageUrl", "images"];
  const changes: string[] = [];

  for (const field of fields) {
    const left = JSON.stringify(before[field]);
    const right = JSON.stringify(after[field]);
    if (left !== right) {
      changes.push(`${String(field)}: ${left} -> ${right}`);
    }
  }

  return changes.join(" | ");
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));

  if (env.NODE_ENV === "production" && !args.dryRun && !args.allowProduction) {
    throw new Error("Refusing real writes in production without --allow-production.");
  }

  await connectToDatabase();

  const listingsCollection = getCollection<ListingDbDoc>("listings");
  const filter = args.all ? ({ source: "ironplanet" } satisfies Filter<ListingDbDoc>) : buildSuspectFilter();
  const candidates = await listingsCollection.find(filter).limit(args.limit).toArray();

  console.log(
    `Starting IronPlanet backfill | dryRun=${args.dryRun} | all=${args.all} | limit=${args.limit} | allowProduction=${args.allowProduction} | nodeEnv=${env.NODE_ENV} | candidates=${candidates.length}`
  );

  let processed = 0;
  let skipped = 0;
  let updated = 0;
  let noops = 0;
  let failures = 0;

  const upserts: ListingDocument[] = [];
  const limit = pLimit(CONCURRENCY);

  const tasks = candidates.map((existing) =>
    limit(async () => {
      processed += 1;

      if (typeof existing.sourceUrl !== "string" || existing.sourceUrl.trim().length === 0) {
        skipped += 1;
        console.warn(`skip id=${existing.id} reason=missing_sourceUrl`);
        return;
      }

      try {
        const scraped = await scrapeIronPlanetDetail(existing.sourceUrl);
        if (!scraped) {
          skipped += 1;
          console.warn(`skip id=${existing.id} url=${existing.sourceUrl} reason=empty_scrape`);
          return;
        }

        const patch: Partial<ListingDocument> = {};

        if (typeof scraped.price === "number" && scraped.price >= 100) {
          patch.price = scraped.price;
        }

        if (typeof scraped.hours === "number" && scraped.hours >= 100) {
          patch.hours = scraped.hours;
        }

        if (typeof scraped.description === "string") {
          const description = scraped.description.trim().replace(/\s+/g, " ");
          if (description.length > 0) {
            patch.description = description;
          }
        }

        const validImages = sanitizeImages(scraped.images);
        if (validImages.length > 0) {
          patch.images = validImages;
          patch.imageUrl = validImages[0];
        }

        if (Object.keys(patch).length === 0) {
          noops += 1;
          return;
        }

        const merged: ListingDocument = {
          ...existing,
          ...patch,
          source: "ironplanet",
          sourceExternalId: existing.sourceExternalId ?? scraped.sourceExternalId,
          sourceUrl: existing.sourceUrl,
          id: existing.id,
          title: existing.title,
          description: patch.description ?? existing.description,
          state: existing.state,
          operable: existing.operable,
          is_operable: existing.is_operable,
          category: existing.category,
          images: (patch.images ?? existing.images) as string[] | undefined,
          imageUrl: patch.imageUrl ?? existing.imageUrl,
          sellerType: existing.sellerType,
          availability: existing.availability,
          year: existing.year,
          make: existing.make,
          model: existing.model,
          listingUpdatedAt: existing.listingUpdatedAt,
          lastSeenAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const diff = toDiff(existing, merged);
        if (!diff) {
          noops += 1;
          return;
        }

        updated += 1;
        console.log(`update id=${existing.id} ${diff}`);

        if (!args.dryRun) {
          upserts.push(merged);
        }
      } catch (error) {
        failures += 1;
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`fail id=${existing.id} url=${existing.sourceUrl} error=${message}`);
      }
    })
  );

  await Promise.all(tasks);

  if (!args.dryRun && upserts.length > 0) {
    const listingsApi = getListingsCollection();
    for (let i = 0; i < upserts.length; i += BATCH_SIZE) {
      const batch = upserts.slice(i, i + BATCH_SIZE).map((doc) => {
        // listings.ts upsertManyBySourceExternalId uses $setOnInsert for insert-only fields,
        // so delete them here to avoid bulkWrite path conflicts with $set.
        const sanitized = { ...doc };
        delete (sanitized as any).createdAt;
        delete (sanitized as any).status;
        delete (sanitized as any).isPublished;
        return sanitized;
      });
      await listingsApi.upsertManyBySourceExternalId("ironplanet", batch);
    }
  }

  console.log(
    `Backfill complete | processed=${processed} | skipped=${skipped} | updated=${updated} | noops=${noops} | failures=${failures}`
  );

  await closeDatabaseConnection();
};

main().catch(async (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  await closeDatabaseConnection();
  process.exit(1);
});
