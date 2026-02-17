import type { AnyBulkWriteOperation, Document } from "mongodb";
import { closeDatabaseConnection, connectToDatabase, getCollection } from "../db.js";

type ListingDoc = Document & {
  _id: unknown;
  source?: string;
  price?: number;
  description?: string;
  imageUrl?: string;
  images?: unknown;
};

const BATCH_SIZE = 250;

const isJunkImage = (url: string): boolean => {
  const lower = url.toLowerCase();
  if (/\/n_images\/|avatar|ritchielist\.png/i.test(lower)) return true;
  if (lower.endsWith(".gif")) return true;

  try {
    const parsed = new URL(url);
    if (parsed.hostname.toLowerCase() === "www.ironplanet.com" && parsed.pathname.toLowerCase().startsWith("/images/")) {
      return true;
    }
  } catch {
    // ignore parse failures
  }

  return false;
};

const sanitizeDescription = (raw: string): string =>
  raw
    .replace(/<\/?li\b[^>]*>/gi, " • ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const toValidImageCandidates = (images: unknown): string[] => {
  if (!Array.isArray(images)) return [];

  return images
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0 && !isJunkImage(value));
};

const flushOperations = async (
  operations: AnyBulkWriteOperation<ListingDoc>[],
  listingsCollection: ReturnType<typeof getCollection<ListingDoc>>
): Promise<number> => {
  if (!operations.length) return 0;
  const result = await listingsCollection.bulkWrite(operations, { ordered: false });
  operations.length = 0;
  return result.modifiedCount;
};

const main = async () => {
  const startedAt = Date.now();
  await connectToDatabase();

  const listingsCollection = getCollection<ListingDoc>("listings");
  const filter: Document = {
    source: "ironplanet",
    $or: [
      { price: { $lte: 1 } },
      { description: { $regex: /<\s*li\b/i } },
      { imageUrl: { $exists: false } },
      { imageUrl: "" },
      { imageUrl: { $regex: /^\s*$/ } },
      { imageUrl: { $regex: /\/n_images\/|avatar|ritchielist\.png|\.gif$/i } },
      { imageUrl: { $regex: /^https?:\/\/www\.ironplanet\.com\/images\//i } },
    ],
  };

  const cursor = listingsCollection.find(filter);

  let matched = 0;
  let updated = 0;
  let skipped = 0;

  const operations: AnyBulkWriteOperation<ListingDoc>[] = [];

  for await (const doc of cursor) {
    matched += 1;

    const nextValues: Partial<ListingDoc> = {};

    if (typeof doc.description === "string") {
      const sanitizedDescription = sanitizeDescription(doc.description);
      if (sanitizedDescription !== doc.description) {
        nextValues.description = sanitizedDescription;
      }
    }

    if (typeof doc.price === "number" && doc.price <= 1 && doc.price !== 0) {
      nextValues.price = 0;
    }

    const imageUrl = typeof doc.imageUrl === "string" ? doc.imageUrl.trim() : "";
    const isCurrentImageInvalid = imageUrl.length === 0 || isJunkImage(imageUrl);

    if (isCurrentImageInvalid) {
      const nextImageUrl = toValidImageCandidates(doc.images)[0];
      if (nextImageUrl && nextImageUrl !== imageUrl) {
        nextValues.imageUrl = nextImageUrl;
      }
    }

    if (Object.keys(nextValues).length === 0) {
      skipped += 1;
      continue;
    }

    operations.push({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: nextValues },
      },
    });

    if (operations.length >= BATCH_SIZE) {
      updated += await flushOperations(operations, listingsCollection);
    }
  }

  updated += await flushOperations(operations, listingsCollection);

  const elapsedMs = Date.now() - startedAt;
  console.log(
    [
      "IronPlanet listing backfill complete",
      `matched=${matched}`,
      `updated=${updated}`,
      `skipped=${skipped}`,
      `timeMs=${elapsedMs}`,
    ].join(" | ")
  );

  await closeDatabaseConnection();
};

main().catch(async (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  await closeDatabaseConnection();
  process.exit(1);
});
