import { ObjectId } from "mongodb";
import { env } from "./env.js";
import { getCollection } from "./db.js";

export type InquiryStatus = "new" | "reviewing" | "contacted" | "closed" | "open" | "spam";

export type InquiryDocument = {
  _id: ObjectId;
  listingId: string;
  sellerId: string | null;
  buyerId: string;
  buyerEmail: string;
  buyerName: string;
  message: string;
  status: InquiryStatus;
  createdAt: Date;
  updatedAt: Date;
};

type InquiryQuery = {
  sellerId?: string | null;
  status?: InquiryStatus;
  listingId?: string;
};

type InquiriesCollection = {
  insertOne: (doc: InquiryDocument) => Promise<void>;
  findMany: (query?: InquiryQuery) => Promise<InquiryDocument[]>;
  updateOne: (
    query: { _id: ObjectId },
    update: { $set: Partial<InquiryDocument> }
  ) => Promise<{ matchedCount: number }>;
  findById: (id: string) => Promise<InquiryDocument | null>;
};

const testInquiries = new Map<string, InquiryDocument>();

const matchesQuery = (doc: InquiryDocument, query?: InquiryQuery) => {
  if (!query) return true;
  if (Object.prototype.hasOwnProperty.call(query, "sellerId") && doc.sellerId !== query.sellerId) {
    return false;
  }
  if (Object.prototype.hasOwnProperty.call(query, "status") && query.status && doc.status !== query.status) {
    return false;
  }
  if (Object.prototype.hasOwnProperty.call(query, "listingId") && query.listingId && doc.listingId !== query.listingId) {
    return false;
  }
  return true;
};

export const getInquiriesCollection = (): InquiriesCollection => {
  try {
    const collection = getCollection<InquiryDocument>("inquiries");
    return {
      insertOne: async (doc) => {
        await collection.insertOne(doc);
      },
      findMany: async (query) => collection.find(query ?? {}).toArray(),
      updateOne: async (query, update) => {
        const result = await collection.updateOne(query, update);
        return { matchedCount: result.matchedCount };
      },
      findById: async (id) => {
        if (!ObjectId.isValid(id)) return null;
        return collection.findOne({ _id: new ObjectId(id) });
      },
    };
  } catch (error) {
    if (env.NODE_ENV !== "test") {
      throw error;
    }

    return {
      insertOne: async (doc) => {
        testInquiries.set(doc._id.toHexString(), doc);
      },
      findMany: async (query) => {
        const result: InquiryDocument[] = [];
        for (const inquiry of testInquiries.values()) {
          if (matchesQuery(inquiry, query)) {
            result.push(inquiry);
          }
        }
        return result;
      },
      updateOne: async (query, update) => {
        const existing = testInquiries.get(query._id.toHexString()) ?? null;
        if (!existing) return { matchedCount: 0 };
        const next: InquiryDocument = {
          ...existing,
          ...update.$set,
          updatedAt: new Date(),
        };
        testInquiries.set(next._id.toHexString(), next);
        return { matchedCount: 1 };
      },
      findById: async (id) => testInquiries.get(id) ?? null,
    };
  }
};
