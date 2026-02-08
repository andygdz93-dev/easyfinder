import { Document } from "mongodb";
import { getCollection } from "./db.js";
import { env } from "./env.js";

export type AuditLog = Document & {
  action_type: string;
  user_id?: string;
  created_at: Date;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  stripe_event_id?: string;
  stripe_event_type?: string;
  metadata?: Record<string, unknown>;
};

const inMemoryAuditLogs: AuditLog[] = [];

export const writeAuditLog = async (
  entry: Omit<AuditLog, "created_at"> & { created_at?: Date }
) => {
  const record: AuditLog = {
    ...entry,
    created_at: entry.created_at ?? new Date(),
  };

  try {
    const collection = getCollection<AuditLog>("audit_logs");
    await collection.insertOne(record);
  } catch (error) {
    if (env.NODE_ENV === "test") {
      inMemoryAuditLogs.push(record);
      return;
    }
    throw error;
  }
};

export const getTestAuditLogs = () => inMemoryAuditLogs;
