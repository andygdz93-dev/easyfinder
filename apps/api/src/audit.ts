import { ObjectId } from "mongodb";
import { getCollection } from "./db.js";
import { env } from "./env.js";

export type AuditTargetType = "listing" | "inquiry" | "scoringConfig" | "ingestion" | "user";

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

export type AuditLogFilters = {
  action?: string;
  targetType?: AuditTargetType;
  targetId?: string;
  actorEmail?: string;
  actorUserId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page: number;
  pageSize: number;
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

export const findAuditLogs = async (filters: AuditLogFilters): Promise<{ items: AuditLog[]; total: number }> => {
  const query: {
    action?: string;
    targetType?: AuditTargetType;
    targetId?: string;
    actorEmail?: string;
  actorUserId?: string;
    createdAt?: { $gte?: Date; $lte?: Date };
  } = {};

  if (filters.action) query.action = filters.action;
  if (filters.targetType) query.targetType = filters.targetType;
  if (filters.targetId) query.targetId = filters.targetId;
  if (filters.actorEmail) query.actorEmail = filters.actorEmail;
  if (filters.actorUserId) query.actorUserId = filters.actorUserId;
  if (filters.dateFrom || filters.dateTo) {
    query.createdAt = {};
    if (filters.dateFrom) query.createdAt.$gte = filters.dateFrom;
    if (filters.dateTo) query.createdAt.$lte = filters.dateTo;
  }

  const skip = (filters.page - 1) * filters.pageSize;

  try {
    const collection = getAuditCollection();
    const [items, total] = await Promise.all([
      collection.find(query).sort({ createdAt: -1 }).skip(skip).limit(filters.pageSize).toArray(),
      collection.countDocuments(query),
    ]);
    return { items, total };
  } catch (error) {
    if (env.NODE_ENV !== "test") {
      throw error;
    }

    const filtered = inMemoryAuditLogs
      .filter((item) => {
        if (query.action && item.action !== query.action) return false;
        if (query.targetType && item.targetType !== query.targetType) return false;
        if (query.targetId && item.targetId !== query.targetId) return false;
        if (query.actorEmail && item.actorEmail !== query.actorEmail) return false;
        if (query.actorUserId && item.actorUserId !== query.actorUserId) return false;
        if (query.createdAt?.$gte && item.createdAt < query.createdAt.$gte) return false;
        if (query.createdAt?.$lte && item.createdAt > query.createdAt.$lte) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return {
      items: filtered.slice(skip, skip + filters.pageSize),
      total: filtered.length,
    };
  }
};
