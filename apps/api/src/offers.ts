import { ObjectId } from "mongodb";
import { getCollection } from "./db.js";
import { env } from "./env.js";

export type OfferStatus = "pending" | "countered" | "accepted" | "rejected" | "expired";
export type OfferHistoryType = "created" | "countered" | "accepted" | "rejected" | "expired";

export type OfferHistoryEntry = {
  type: OfferHistoryType;
  amount: number;
  by: ObjectId;
  createdAt: Date;
};

export type OfferDocument = {
  _id: ObjectId;
  listingId: ObjectId;
  buyerId: ObjectId;
  sellerId: ObjectId;
  originalAmount: number;
  currentAmount: number;
  message?: string;
  status: OfferStatus;
  history: OfferHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
};

type OfferQuery = {
  _id?: ObjectId;
  buyerId?: ObjectId;
  sellerId?: ObjectId;
};

type OffersCollection = {
  insertOne: (doc: OfferDocument) => Promise<void>;
  findById: (id: string) => Promise<OfferDocument | null>;
  findMany: (query: OfferQuery) => Promise<OfferDocument[]>;
  updateOne: (
    query: { _id: ObjectId },
    update: { $set: Partial<OfferDocument>; $push?: { history: OfferHistoryEntry } }
  ) => Promise<{ matchedCount: number }>;
};

const testOffers = new Map<string, OfferDocument>();

export const __resetTestOffers = () => {
  testOffers.clear();
};

export const getOffersCollection = (): OffersCollection => {
  try {
    const collection = getCollection<OfferDocument>("offers");

    return {
      insertOne: async (doc) => {
        await collection.insertOne(doc);
      },
      findById: async (id) => {
        if (!ObjectId.isValid(id)) return null;
        return collection.findOne({ _id: new ObjectId(id) });
      },
      findMany: async (query) => collection.find(query).sort({ updatedAt: -1 }).toArray(),
      updateOne: async (query, update) => {
        const result = await collection.updateOne(query, update);
        return { matchedCount: result.matchedCount };
      },
    };
  } catch (error) {
    if (env.NODE_ENV !== "test") {
      throw error;
    }

    return {
      insertOne: async (doc) => {
        testOffers.set(doc._id.toHexString(), doc);
      },
      findById: async (id) => testOffers.get(id) ?? null,
      findMany: async (query) => {
        const docs = Array.from(testOffers.values());
        return docs
          .filter((doc) => {
            if (query._id && !doc._id.equals(query._id)) return false;
            if (query.buyerId && !doc.buyerId.equals(query.buyerId)) return false;
            if (query.sellerId && !doc.sellerId.equals(query.sellerId)) return false;
            return true;
          })
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      },
      updateOne: async (query, update) => {
        const existing = testOffers.get(query._id.toHexString()) ?? null;
        if (!existing) return { matchedCount: 0 };

        const next: OfferDocument = {
          ...existing,
          ...update.$set,
          history: [...existing.history],
        };

        if (update.$push?.history) {
          next.history.push(update.$push.history);
        }

        testOffers.set(existing._id.toHexString(), next);
        return { matchedCount: 1 };
      },
    };
  }
};
