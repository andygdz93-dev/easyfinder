import { Collection, Db, MongoClient } from "mongodb";
import { env } from "./env.js";

let client: MongoClient | null = null;
let db: Db | null = null;
let connectPromise: Promise<Db> | null = null;

export const connectToDatabase = async () => {
  if (db) return db;

  if (!env.MONGO_URL || !env.DB_NAME) {
    throw new Error("Missing required Mongo configuration (MONGO_URL, DB_NAME).");
  }

  if (!connectPromise) {
    client = new MongoClient(env.MONGO_URL);
    connectPromise = client
      .connect()
      .then(async (connected: MongoClient) => {
        db = connected.db(env.DB_NAME);
        await db.collection("users").createIndex({ emailLower: 1 }, { unique: true });
        return db;
      })
      .catch((error: unknown) => {
        connectPromise = null;
        throw error;
      });
  }

  return connectPromise;
};

export const getDb = () => {
  if (!db) {
    throw new Error("Database not initialized. Call connectToDatabase() on startup.");
  }
  return db;
};

export const getCollection = <T>(name: string): Collection<T> => getDb().collection<T>(name);
