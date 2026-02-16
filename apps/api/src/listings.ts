import type { Listing } from "@easyfinderai/shared";
import { getCollection } from "./db.js";
import { env } from "./env.js";

export type ListingStatus = "active" | "paused" | "removed" | "pending_review";

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

type AdminListingFilters = {
  q?: string;
  status?: string;
  source?: string;
  page?: number;
  pageSize?: number;
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
  findAdminListings: (filters?: AdminListingFilters) => Promise<{ items: ListingDocument[]; total: number }>;
  findById: (id: string) => Promise<ListingDocument | null>;
  updateById: (id: string, update: Partial<ListingDocument>) => Promise<{ matchedCount: number }>;
  deleteById: (id: string) => Promise<{ deletedCount: number }>;
  getStatusCounts: () => Promise<Record<ListingStatus, number>>;
  getSourceCounts: () => Promise<Record<string, number>>;
};

const testListings: ListingDocument[] = [];

const normalizeStatus = (status?: string): ListingStatus => {
  if (status === "active" || status === "paused" || status === "removed" || status === "pending_review") {
    return status;
  }
  return "active";
};

const isLiveListing = (listing: ListingDocument) => {
  return normalizeStatus(listing.status) === "active" && listing.isPublished !== false;
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

const applyAdminFilters = (input: ListingDocument[], filters?: AdminListingFilters) => {
  const q = filters?.q?.trim().toLowerCase();
  const source = filters?.source?.trim().toLowerCase();
  const status = filters?.status;

  const filtered = input.filter((listing) => {
    if (status && normalizeStatus(listing.status) !== status) {
      return false;
    }

    if (source && (listing.source ?? "").toLowerCase() !== source) {
      return false;
    }

    if (q) {
      const blob = [listing.id, listing.title, listing.description, listing.source]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!blob.includes(q)) {
        return false;
      }
    }

    return true;
  });

  const total = filtered.length;
  const page = Math.max(1, filters?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters?.pageSize ?? 20));
  const start = (page - 1) * pageSize;
  const items = filtered.sort(sortByUpdatedAtDesc).slice(start, start + pageSize);
  return { items, total };
};

export const getListingsCollection = (): ListingsCollection => {
  try {
    const collection = getCollection<ListingDocument>("listings");
    return {
      insertMany: async (listings) => {
        if (!listings.length) return;
        const now = new Date().toISOString();
        await collection.insertMany(
          listings.map((listing) => ({
            ...listing,
            status: normalizeStatus(listing.status),
            updatedAt: listing.updatedAt ?? now,
          }))
        );
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
                  status: normalizeStatus(listing.status),
                  updatedAt: now,
                },
                $setOnInsert: {
                  createdAt: listing.createdAt ?? now,
                  isPublished: true,
                  status: "active" as const,
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
          .find({ status: "active" as const, isPublished: { $ne: false } })
          .sort({ updatedAt: -1 })
          .toArray(),
      findLiveListingById: async (id) =>
        collection.findOne({ id, status: "active" as const, isPublished: { $ne: false } }),
      findSellerListings: async (sellerId) =>
        collection
          .find({ source: `seller:${sellerId}` })
          .sort({ updatedAt: -1 })
          .toArray(),
      countSellerListings: async (sellerId) =>
        collection.countDocuments({ source: `seller:${sellerId}`, status: "active" as const, isPublished: { $ne: false } }),
      findAdminListings: async (filters) => {
        const query: Record<string, unknown> = {};
        if (filters?.status) query.status = filters.status;
        if (filters?.source) query.source = filters.source;
        if (filters?.q) {
          query.$or = [
            { id: { $regex: filters.q, $options: "i" } },
            { title: { $regex: filters.q, $options: "i" } },
            { description: { $regex: filters.q, $options: "i" } },
          ];
        }

        const page = Math.max(1, filters?.page ?? 1);
        const pageSize = Math.min(100, Math.max(1, filters?.pageSize ?? 20));
        const skip = (page - 1) * pageSize;

        const [items, total] = await Promise.all([
          collection.find(query).sort({ updatedAt: -1 }).skip(skip).limit(pageSize).toArray(),
          collection.countDocuments(query),
        ]);

        return { items, total };
      },
      findById: async (id) => collection.findOne({ id }),
      updateById: async (id, update) => {
        const result = await collection.updateOne({ id }, { $set: { ...update, updatedAt: new Date().toISOString() } });
        return { matchedCount: result.matchedCount };
      },
      deleteById: async (id) => {
        const result = await collection.deleteOne({ id });
        return { deletedCount: result.deletedCount };
      },
      getStatusCounts: async () => {
        const docs = await collection
          .aggregate<{ _id: ListingStatus; count: number }>([{ $group: { _id: "$status", count: { $sum: 1 } } }])
          .toArray();
        const base: Record<ListingStatus, number> = { active: 0, paused: 0, removed: 0, pending_review: 0 };
        for (const doc of docs) {
          const key = normalizeStatus(doc._id);
          base[key] += doc.count;
        }
        return base;
      },
      getSourceCounts: async () => {
        const docs = await collection
          .aggregate<{ _id: string; count: number }>([{ $group: { _id: "$source", count: { $sum: 1 } } }])
          .toArray();
        return docs.reduce<Record<string, number>>((acc, doc) => {
          acc[doc._id ?? "unknown"] = doc.count;
          return acc;
        }, {});
      },
    };
  } catch (error) {
    if (env.NODE_ENV !== "test") {
      throw error;
    }

    return {
      insertMany: async (listings) => {
        for (const listing of listings) {
          testListings.push({ ...listing, status: normalizeStatus(listing.status) });
        }
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
            status: normalizeStatus(listing.status),
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
      findAdminListings: async (filters) => applyAdminFilters(testListings, filters),
      findById: async (id) => testListings.find((listing) => listing.id === id) ?? null,
      updateById: async (id, update) => {
        const idx = testListings.findIndex((listing) => listing.id === id);
        if (idx === -1) return { matchedCount: 0 };
        testListings[idx] = {
          ...testListings[idx],
          ...update,
          status: normalizeStatus((update.status as string | undefined) ?? testListings[idx].status),
          updatedAt: new Date().toISOString(),
        };
        return { matchedCount: 1 };
      },
      deleteById: async (id) => {
        const idx = testListings.findIndex((listing) => listing.id === id);
        if (idx === -1) return { deletedCount: 0 };
        testListings.splice(idx, 1);
        return { deletedCount: 1 };
      },
      getStatusCounts: async () => {
        const base: Record<ListingStatus, number> = { active: 0, paused: 0, removed: 0, pending_review: 0 };
        for (const listing of testListings) {
          base[normalizeStatus(listing.status)] += 1;
        }
        return base;
      },
      getSourceCounts: async () => {
        return testListings.reduce<Record<string, number>>((acc, listing) => {
          const key = listing.source ?? "unknown";
          acc[key] = (acc[key] ?? 0) + 1;
          return acc;
        }, {});
      },
    };
  }
};
