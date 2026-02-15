import type { Listing } from "@easyfinderai/shared";
import { getCollection } from "./db.js";
import { env } from "./env.js";

export type ListingDocument = Listing & {
  status?: string;
  isPublished?: boolean;
  publishedAt?: string;
  updatedAt?: string;
  sourceExternalId?: string;
  sourceUrl?: string;
  imageUrl?: string;
  make?: string;
  model?: string;
};

type ListingsCollection = {
  insertMany: (listings: ListingDocument[]) => Promise<void>;
  findBySourceAndExternalIds: (source: string, ids: string[]) => Promise<ListingDocument[]>;
  upsertManyBySourceExternalId: (
    source: string,
    listings: ListingDocument[]
  ) => Promise<{ upserted: number; modified: number; matched: number }>;
  findLiveListings: () => Promise<ListingDocument[]>;
  findLiveListingById: (id: string) => Promise<ListingDocument | null>;
  findSellerListings: (sellerId: string) => Promise<ListingDocument[]>;
  countSellerListings: (sellerId: string) => Promise<number>;
};

const testListings: ListingDocument[] = [];

const isLiveListing = (listing: ListingDocument) => {
  const status = typeof listing.status === "string" ? listing.status.toLowerCase() : "active";
  return status === "active" && listing.isPublished !== false;
};

const toTime = (value?: string) => {
  if (!value) return 0;
  const t = Date.parse(value);
  return Number.isNaN(t) ? 0 : t;
};

const sortByUpdatedAtDesc = (a: ListingDocument, b: ListingDocument) => {
  const aTime = toTime(a.updatedAt ?? a.createdAt);
  const bTime = toTime(b.updatedAt ?? b.createdAt);
  return bTime - aTime;
};

export const getListingsCollection = (): ListingsCollection => {
  try {
    const collection = getCollection<ListingDocument>("listings");
    return {
      insertMany: async (listings) => {
        if (!listings.length) return;
        await collection.insertMany(listings);
      },
      findBySourceAndExternalIds: async (source, ids) => {
        if (!ids.length) return [];
        return collection.find({ source, sourceExternalId: { $in: ids } }).toArray();
      },
      upsertManyBySourceExternalId: async (source, listings) => {
        if (!listings.length) {
          return { upserted: 0, modified: 0, matched: 0 };
        }
        const now = new Date().toISOString();
        const operations = listings.map((listing) => {
          const sourceExternalId = listing.sourceExternalId;
          if (typeof sourceExternalId !== "string" || sourceExternalId.trim().length === 0) {
            throw new Error("upsertManyBySourceExternalId requires listing.sourceExternalId to be a non-empty string");
          }

          return {
            updateOne: {
              filter: { source, sourceExternalId },
              update: {
                $set: {
                  ...listing,
                  source,
                  sourceExternalId,
                  updatedAt: now,
                },
                $setOnInsert: {
                  createdAt: listing.createdAt ?? now,
                  isPublished: true,
                  status: "active",
                },
              },
              upsert: true,
            },
          };
        });

        if (!operations.length) {
          return { upserted: 0, modified: 0, matched: 0 };
        }

        const result = await collection.bulkWrite(operations, { ordered: false });
        return {
          upserted: result.upsertedCount,
          modified: result.modifiedCount,
          matched: result.matchedCount,
        };
      },
      findLiveListings: async () =>
        collection
          .find({ status: "active", isPublished: { $ne: false } })
          .sort({ updatedAt: -1 })
          .toArray(),
      findLiveListingById: async (id) =>
        collection.findOne({ id, status: "active", isPublished: { $ne: false } }),
      findSellerListings: async (sellerId) =>
        collection
          .find({ source: `seller:${sellerId}` })
          .sort({ updatedAt: -1 })
          .toArray(),
      countSellerListings: async (sellerId) =>
        collection.countDocuments({ source: `seller:${sellerId}`, status: "active", isPublished: { $ne: false } }),
    };
  } catch (error) {
    if (env.NODE_ENV !== "test") {
      throw error;
    }

    return {
      insertMany: async (listings) => {
        testListings.push(...listings);
      },
      findBySourceAndExternalIds: async (source, ids) => {
        if (!ids.length) return [];
        const lookup = new Set(ids);
        return testListings.filter(
          (listing) =>
            listing.source === source &&
            typeof listing.sourceExternalId === "string" &&
            lookup.has(listing.sourceExternalId)
        );
      },
      upsertManyBySourceExternalId: async (source, listings) => {
        let upserted = 0;
        let modified = 0;
        let matched = 0;
        const now = new Date().toISOString();

        for (const listing of listings) {
          const sourceExternalId = listing.sourceExternalId;
          if (typeof sourceExternalId !== "string" || sourceExternalId.trim().length === 0) {
            throw new Error("upsertManyBySourceExternalId requires listing.sourceExternalId to be a non-empty string");
          }

          const idx = testListings.findIndex(
            (entry) => entry.source === source && entry.sourceExternalId === sourceExternalId
          );

          const normalized: ListingDocument = {
            ...listing,
            source,
            sourceExternalId,
            updatedAt: now,
          };

          if (idx === -1) {
            testListings.push({ ...normalized, createdAt: listing.createdAt ?? now });
            upserted += 1;
          } else {
            matched += 1;
            const existingCreatedAt = testListings[idx]?.createdAt;
            testListings[idx] = {
              ...testListings[idx],
              ...normalized,
              createdAt: existingCreatedAt ?? listing.createdAt ?? now,
            };
            modified += 1;
          }
        }

        return { upserted, modified, matched };
      },
      findLiveListings: async () => testListings.filter(isLiveListing).sort(sortByUpdatedAtDesc),
      findLiveListingById: async (id) => testListings.find((listing) => listing.id === id && isLiveListing(listing)) ?? null,
      findSellerListings: async (sellerId) =>
        testListings.filter((listing) => listing.source === `seller:${sellerId}`).sort(sortByUpdatedAtDesc),
      countSellerListings: async (sellerId) =>
        testListings.filter((listing) => listing.source === `seller:${sellerId}` && isLiveListing(listing)).length,
    };
  }
};
