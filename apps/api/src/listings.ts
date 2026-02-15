import type { Listing } from "@easyfinderai/shared";
import { getCollection } from "./db.js";
import { env } from "./env.js";

export type ListingDocument = Listing & {
  status?: string;
  isPublished?: boolean;
  publishedAt?: string;
  updatedAt?: string;
  make?: string;
  model?: string;
};

type ListingsCollection = {
  insertMany: (listings: ListingDocument[]) => Promise<void>;
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

const sortByUpdatedAtDesc = (a: ListingDocument, b: ListingDocument) => {
  const aTime = new Date(a.updatedAt ?? a.createdAt).getTime();
  const bTime = new Date(b.updatedAt ?? b.createdAt).getTime();
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
      findLiveListings: async () => testListings.filter(isLiveListing).sort(sortByUpdatedAtDesc),
      findLiveListingById: async (id) => testListings.find((listing) => listing.id === id && isLiveListing(listing)) ?? null,
      findSellerListings: async (sellerId) =>
        testListings.filter((listing) => listing.source === `seller:${sellerId}`).sort(sortByUpdatedAtDesc),
      countSellerListings: async (sellerId) =>
        testListings.filter((listing) => listing.source === `seller:${sellerId}` && isLiveListing(listing)).length,
    };
  }
};
