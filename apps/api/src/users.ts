import { ObjectId } from "mongodb";
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
};

type UsersCollection = {
  findOne: (query: { emailLower?: string; _id?: ObjectId }) => Promise<UserDocument | null>;
  insertOne: (doc: UserDocument) => Promise<void>;
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
        return null;
      },
      insertOne: async (doc) => {
        testUsers.set(doc.emailLower, doc);
      },
    };
  }
};
