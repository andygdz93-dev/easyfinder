import { ObjectId } from "mongodb";
import { getCollection } from "./db.js";
import { env } from "./env.js";

export type AuditTargetType = "listing" | "inquiry" | "scoringConfig" | "ingestion";

export type AdminAuditEvent = {
  id?: string;
  actorUserId: string;
  actorEmail: string;
  action: string;
  targetType: AuditTargetType;
  targetId: string;
  reason?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  requestId: string;
  createdAt?: Date;
};

export type AuditLog = {
  _id?: ObjectId;
  id: string;
  actorUserId: string;
  actorEmail: string;
  action: string;
  targetType: AuditTargetType;
  targetId: string;
  reason?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  requestId: string;
  createdAt: Date;
};

const inMemoryAuditLogs: AuditLog[] = [];
let indexesEnsured = false;

export const getAuditCollection = () => {
  const collection = getCollection<AuditLog>("audit_logs");
  if (!indexesEnsured) {
    indexesEnsured = true;
    void collection.createIndex({ createdAt: -1 });
    void collection.createIndex({ targetType: 1, targetId: 1 });
  }
  return collection;
};

export const insertAuditEvent = async (event: AdminAuditEvent) => {
  const record: AuditLog = {
    id: event.id ?? new ObjectId().toHexString(),
    actorUserId: event.actorUserId,
    actorEmail: event.actorEmail,
    action: event.action,
    targetType: event.targetType,
    targetId: event.targetId,
    reason: event.reason,
    before: event.before ?? null,
    after: event.after ?? null,
    requestId: event.requestId,
    createdAt: event.createdAt ?? new Date(),
  };

  try {
    await getAuditCollection().insertOne(record);
  } catch (error) {
    if (env.NODE_ENV === "test") {
      inMemoryAuditLogs.push(record);
      return;
    }
    throw error;
  }
};

export const writeAuditLog = async (
  action_type: string,
  entry: {
    user_id?: string;
    old_values?: Record<string, unknown>;
    new_values?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    stripe_event_id?: string;
    stripe_event_type?: string;
    created_at?: Date;
  } = {}
) => {
  await insertAuditEvent({
    actorUserId: entry.user_id ?? "system",
    actorEmail: "system@easyfinder.local",
    action: action_type,
    targetType: "ingestion",
    targetId: entry.metadata?.targetId ? String(entry.metadata.targetId) : entry.stripe_event_id ?? "unknown",
    before: entry.old_values,
    after: entry.new_values,
    requestId: (entry.metadata?.requestId as string | undefined) ?? "n/a",
    createdAt: entry.created_at,
  });
};

export const getTestAuditLogs = () => inMemoryAuditLogs;
