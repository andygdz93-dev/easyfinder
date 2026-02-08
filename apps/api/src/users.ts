import { ObjectId } from "mongodb";
import { BillingInfo, defaultBilling, normalizeBilling } from "./billing.js";
import { env } from "./env.js";
import { getCollection } from "./db.js";
import { users as demoUsers } from "./store.js";

export type UserDocument = {
  _id: ObjectId;
  email: string;
  emailLower: string;
  name: string;
  role: "buyer" | "seller" | "admin";
  passwordHash?: string;
  ndaAcceptedAt?: Date;
  ndaVersion?: string;
  createdAt?: Date;
  updatedAt?: Date;
  billing?: BillingInfo;
};

type UserQuery = {
  emailLower?: string;
  _id?: ObjectId;
  "billing.stripe_customer_id"?: string;
};

type UsersCollection = {
  findOne: (query: UserQuery) => Promise<UserDocument | null>;
  insertOne: (doc: UserDocument) => Promise<void>;
  updateOne: (
    query: UserQuery,
    update: { $set: Partial<UserDocument> }
  ) => Promise<void>;
};

const testUsers = new Map<string, UserDocument>();

const seedTestUsers = () => {
  if (testUsers.size) return;

  demoUsers.forEach((user) => {
    if (!user.email) return;
    const now = new Date();
    const doc: UserDocument = {
      _id: new ObjectId(),
      email: user.email,
      emailLower: user.email.toLowerCase(),
      name: user.name ?? "Demo User",
      role: user.role === "demo" ? "buyer" : user.role ?? "buyer",
      passwordHash: user.passwordHash ?? "",
      billing: normalizeBilling(
        user.billing
          ? {
              ...user.billing,
              current_period_end: user.billing.current_period_end
                ? new Date(user.billing.current_period_end)
                : defaultBilling().current_period_end,
            }
          : defaultBilling()
      ),
      createdAt: now,
      updatedAt: now,
    };
    testUsers.set(doc.emailLower, doc);
  });
};

export const getUsersCollection = (): UsersCollection => {
  try {
    const collection = getCollection<UserDocument>("users");
    return {
      findOne: (query) => collection.findOne(query),
      insertOne: async (doc) => {
        await collection.insertOne(doc);
      },
      updateOne: async (query, update) => {
        await collection.updateOne(query, update);
      },
    };
  } catch (error) {
    if (env.NODE_ENV !== "test") {
      throw error;
    }

    seedTestUsers();
    return {
      findOne: async (query) => {
        if (query.emailLower) {
          return testUsers.get(query.emailLower) ?? null;
        }
        if (query._id) {
          for (const user of testUsers.values()) {
            if (user._id.equals(query._id)) {
              return user;
            }
          }
        }
        if (query["billing.stripe_customer_id"]) {
          for (const user of testUsers.values()) {
            if (
              user.billing?.stripe_customer_id ===
              query["billing.stripe_customer_id"]
            ) {
              return user;
            }
          }
        }
        return null;
      },
      insertOne: async (doc) => {
        testUsers.set(doc.emailLower, doc);
      },
      updateOne: async (query, update) => {
        const existing = await (async () => {
          if (query._id) {
            for (const user of testUsers.values()) {
              if (user._id.equals(query._id)) return user;
            }
          }
          if (query.emailLower) {
            return testUsers.get(query.emailLower) ?? null;
          }
          if (query["billing.stripe_customer_id"]) {
            for (const user of testUsers.values()) {
              if (
                user.billing?.stripe_customer_id ===
                query["billing.stripe_customer_id"]
              ) {
                return user;
              }
            }
          }
          return null;
        })();

        if (!existing) return;
        const next: UserDocument = {
          ...existing,
          ...update.$set,
          updatedAt: new Date(),
        };
        testUsers.set(next.emailLower, next);
      },
    };
  }
};
