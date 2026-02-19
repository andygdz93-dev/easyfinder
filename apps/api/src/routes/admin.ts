import { ObjectId } from "mongodb";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { ok, fail } from "../response.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { getListingsCollection } from "../listings.js";
import { getInquiriesCollection } from "../inquiries.js";
import { getUsersCollection } from "../users.js";
import { env } from "../env.js";
import { sourceHealth } from "../store.js";
import { findAuditLogs, insertAuditEvent } from "../audit.js";

const listingStatuses = ["active", "paused", "removed", "pending_review"] as const;
const inquiryStatuses = ["open", "closed", "spam"] as const;

const listQuerySchema = z.object({
  q: z.string().optional(),
  status: z.enum(listingStatuses).optional(),
  source: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

const userPatchSchema = z
  .object({
    role: z.enum(["buyer", "seller", "enterprise", "admin"]).optional(),
    disabled: z.boolean().optional(),
  })
  .refine((value) => value.role !== undefined || value.disabled !== undefined, {
    message: "Provide role and/or disabled",
  });

const listingPatchSchema = z
  .object({
    status: z.enum(["active", "paused", "removed"]).optional(),
    isPublished: z.boolean().optional(),
    title: z.string().min(1).optional(),
    price: z.number().nonnegative().optional(),
    state: z.string().min(1).optional(),
    reason: z.string().min(1).optional(),
  })
  .refine(
    (value) =>
      value.status !== undefined ||
      value.isPublished !== undefined ||
      value.title !== undefined ||
      value.price !== undefined ||
      value.state !== undefined,
    { message: "Provide at least one listing field to update" }
  );


const deleteListingSchema = z.object({
  confirmation: z.string().min(1),
  reason: z.string().min(1),
});

const inquiryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(inquiryStatuses).optional(),
});

const auditQuerySchema = z.object({
  event: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
  resource: z.string().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

const toInquiryStatus = (status: (typeof inquiryStatuses)[number]) => {
  if (status === "open") return "new" as const;
  if (status === "closed") return "closed" as const;
  return "reviewing" as const;
};

export default async function adminRoutes(app: FastifyInstance) {
  const guard = { preHandler: [app.authenticate, requireAdmin] };

  app.get("/overview", guard, async (request) => {
    const listingsCollection = getListingsCollection();
    const inquiriesCollection = getInquiriesCollection();
    const usersCollection = getUsersCollection();

    const [statusCounts, inquiries, users, recentAudit] = await Promise.all([
      listingsCollection.getStatusCounts(),
      inquiriesCollection.findMany(),
      usersCollection.findMany(),
      findAuditLogs({ page: 1, pageSize: 20 }),
    ]);

    const lastIngestion = Array.from(sourceHealth.entries()).reduce<Record<string, string | null>>((acc, [source, info]) => {
      acc[source] = info.lastSync ?? null;
      return acc;
    }, {});

    return ok(request, {
      counts: {
        users: users.length,
        listings: Object.values(statusCounts).reduce((sum, value) => sum + value, 0),
        inquiries: inquiries.length,
      },
      listings: statusCounts,
      inquiries: {
        open: inquiries.filter((x) => x.status !== "closed").length,
        closed: inquiries.filter((x) => x.status === "closed").length,
      },
      recentActivity: recentAudit.items.map((item) => ({
        timestamp: item.createdAt.toISOString(),
        userId: item.actorUserId,
        event: item.action,
        requestId: item.requestId,
        resource: `${item.targetType}:${item.targetId}`,
      })),
      lastIngestion,
      demoMode: env.DEMO_MODE,
      billingEnabled: env.BILLING_ENABLED,
    });
  });

  app.get("/users", guard, async (request) => {
    const query = z.object({ q: z.string().optional() }).parse(request.query);
    const users = await getUsersCollection().findMany();
    const q = query.q?.trim().toLowerCase();
    const items = users
      .filter((user) => {
        if (!q) return true;
        return [user.email, user.name, user.role ?? ""].join(" ").toLowerCase().includes(q);
      })
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
      .map((user) => ({
        id: user._id.toHexString(),
        email: user.email,
        name: user.name,
        role: user.role,
        plan: user.billing?.plan ?? "free",
        created: user.createdAt?.toISOString() ?? null,
        lastLogin: user.lastLoginAt?.toISOString() ?? null,
        status: user.disabled ? "disabled" : "active",
      }));

    return ok(request, { items, total: items.length });
  });

  app.patch("/users/:id", guard, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!ObjectId.isValid(id)) return fail(request, reply, "BAD_REQUEST", "Invalid user id.", 400);
    const payload = userPatchSchema.parse(request.body);
    const users = getUsersCollection();
    const before = await users.findOne({ _id: new ObjectId(id) });
    if (!before) return fail(request, reply, "NOT_FOUND", "User not found.", 404);

    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (payload.role !== undefined) {
      update.role = payload.role;
      update.roleSetAt = new Date();
    }
    if (payload.disabled !== undefined) {
      update.disabled = payload.disabled;
    }

    await users.updateOne({ _id: new ObjectId(id) }, { $set: update });
    const after = await users.findOne({ _id: new ObjectId(id) });

    if (payload.role !== undefined && payload.role !== before.role) {
      await insertAuditEvent({
        actorUserId: request.user.id,
        actorEmail: request.user.email,
        action: "ROLE_CHANGED",
        targetType: "user",
        targetId: id,
        before: { role: before.role },
        after: { role: payload.role },
        requestId: request.requestId,
      });
    }

    if (payload.disabled !== undefined && payload.disabled !== Boolean(before.disabled)) {
      await insertAuditEvent({
        actorUserId: request.user.id,
        actorEmail: request.user.email,
        action: payload.disabled ? "USER_DISABLED" : "USER_ENABLED",
        targetType: "user",
        targetId: id,
        before: { disabled: Boolean(before.disabled) },
        after: { disabled: payload.disabled },
        requestId: request.requestId,
      });
    }

    return ok(request, { user: after });
  });

  app.get("/listings", guard, async (request) => {
    const query = listQuerySchema.parse(request.query);
    const result = await getListingsCollection().findAdminListings(query);
    const items = result.items.map((item) => ({
      id: item.id,
      title: item.title,
      seller: (item.source ?? "").startsWith("seller:") ? item.source.replace("seller:", "") : null,
      source: item.source ?? null,
      score: null,
      state: item.state ?? null,
      created: item.createdAt ?? null,
      status: item.status ?? "active",
      imagesCount: Array.isArray(item.images) ? item.images.length : 0,
      isPublished: item.isPublished !== false,
      price: item.price,
    }));
    return ok(request, { items, total: result.total, page: query.page, pageSize: query.pageSize });
  });


  app.get("/listings/:id", guard, async (request, reply) => {
    const { id } = request.params as { id: string };
    const listing = await getListingsCollection().findById(id);
    if (!listing) return fail(request, reply, "NOT_FOUND", "Listing not found.", 404);

    const [inquiries, audit] = await Promise.all([
      getInquiriesCollection().findMany({ listingId: id }),
      findAuditLogs({ targetType: "listing", targetId: id, page: 1, pageSize: 25 }),
    ]);

    return ok(request, {
      listing,
      inquiries: inquiries.map((inquiry) => ({
        id: inquiry._id.toHexString(),
        listingId: inquiry.listingId,
        sellerId: inquiry.sellerId,
        buyerId: inquiry.buyerId,
        buyerEmail: inquiry.buyerEmail,
        buyerName: inquiry.buyerName,
        message: inquiry.message,
        status: inquiry.status,
        createdAt: inquiry.createdAt.toISOString(),
        updatedAt: inquiry.updatedAt.toISOString(),
      })),
      audit: audit.items.map((item) => ({
        id: item.id,
        actorUserId: item.actorUserId,
        actorEmail: item.actorEmail,
        action: item.action,
        targetType: item.targetType,
        targetId: item.targetId,
        reason: item.reason,
        requestId: item.requestId,
        createdAt: item.createdAt.toISOString(),
      })),
    });
  });

  app.patch("/listings/:id", guard, async (request, reply) => {
    const { id } = request.params as { id: string };
    const payload = listingPatchSchema.parse(request.body);
    const before = await getListingsCollection().findById(id);
    if (!before) return fail(request, reply, "NOT_FOUND", "Listing not found.", 404);

    const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (payload.status !== undefined) update.status = payload.status;
    if (payload.isPublished !== undefined) update.isPublished = payload.isPublished;
    if (payload.title !== undefined) update.title = payload.title;
    if (payload.price !== undefined) update.price = payload.price;
    if (payload.state !== undefined) update.state = payload.state;

    await getListingsCollection().updateById(id, update);
    const after = await getListingsCollection().findById(id);

    if (payload.status === "removed") {
      await insertAuditEvent({
        actorUserId: request.user.id,
        actorEmail: request.user.email,
        action: "LISTING_DELETED",
        targetType: "listing",
        targetId: id,
        reason: payload.reason,
        before: before as unknown as Record<string, unknown>,
        after: after as unknown as Record<string, unknown>,
        requestId: request.requestId,
      });
    } else if (payload.isPublished === false || payload.status === "paused") {
      await insertAuditEvent({
        actorUserId: request.user.id,
        actorEmail: request.user.email,
        action: "LISTING_UNPUBLISHED",
        targetType: "listing",
        targetId: id,
        reason: payload.reason,
        before: before as unknown as Record<string, unknown>,
        after: after as unknown as Record<string, unknown>,
        requestId: request.requestId,
      });
    } else {
      await insertAuditEvent({
        actorUserId: request.user.id,
        actorEmail: request.user.email,
        action: "LISTING_UPDATED",
        targetType: "listing",
        targetId: id,
        reason: payload.reason,
        before: before as unknown as Record<string, unknown>,
        after: after as unknown as Record<string, unknown>,
        requestId: request.requestId,
      });
    }

    return ok(request, { listing: after });
  });


  app.delete("/listings/:id", guard, async (request, reply) => {
    const { id } = request.params as { id: string };
    const payload = deleteListingSchema.parse(request.body);
    const expectedConfirmation = `DELETE ${id}`;
    if (payload.confirmation !== expectedConfirmation) {
      return fail(request, reply, "BAD_REQUEST", `confirmation must equal "${expectedConfirmation}"`, 400);
    }

    const before = await getListingsCollection().findById(id);
    if (!before) return fail(request, reply, "NOT_FOUND", "Listing not found.", 404);

    const result = await getListingsCollection().deleteById(id);
    if (!result.deletedCount) return fail(request, reply, "NOT_FOUND", "Listing not found.", 404);

    await insertAuditEvent({
      actorUserId: request.user.id,
      actorEmail: request.user.email,
      action: "LISTING_DELETED",
      targetType: "listing",
      targetId: id,
      reason: payload.reason,
      before: before as unknown as Record<string, unknown>,
      after: null,
      requestId: request.requestId,
    });

    return ok(request, { deleted: true });
  });

  app.get("/inquiries", guard, async (request) => {
    const query = inquiryQuerySchema.parse(request.query);
    const all = await getInquiriesCollection().findMany();
    const mapped = all.map((inquiry) => ({
      id: inquiry._id.toHexString(),
      listingId: inquiry.listingId,
      sellerId: inquiry.sellerId,
      buyerId: inquiry.buyerId,
      createdAt: inquiry.createdAt.toISOString(),
      status: inquiry.status,
    }));

    const filtered = query.status
      ? mapped.filter((inq) =>
          query.status === "open"
            ? inq.status !== "closed"
            : query.status === "closed"
              ? inq.status === "closed"
              : inq.status === "reviewing"
        )
      : mapped;

    const start = (query.page - 1) * query.pageSize;
    return ok(request, { items: filtered.slice(start, start + query.pageSize), total: filtered.length, page: query.page, pageSize: query.pageSize });
  });

  app.patch("/inquiries/:id", guard, async (request, reply) => {
    const { id } = request.params as { id: string };
    const payload = z.object({ status: z.enum(inquiryStatuses) }).parse(request.body);
    const before = await getInquiriesCollection().findById(id);
    if (!before) return fail(request, reply, "NOT_FOUND", "Inquiry not found.", 404);

    const updateResult = await getInquiriesCollection().updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: toInquiryStatus(payload.status) } }
    );

    if (!updateResult.matchedCount) return fail(request, reply, "NOT_FOUND", "Inquiry not found.", 404);
    const after = await getInquiriesCollection().findById(id);

    await insertAuditEvent({
      actorUserId: request.user.id,
      actorEmail: request.user.email,
      action: "INQUIRY_STATUS_UPDATED",
      targetType: "inquiry",
      targetId: id,
      before: before as unknown as Record<string, unknown>,
      after: (after ?? undefined) as unknown as Record<string, unknown>,
      requestId: request.requestId,
    });

    return ok(request, { inquiry: after });
  });


  app.post("/scrape/ironplanet", guard, async (request, reply) => {
    return fail(request, reply, "NOT_IMPLEMENTED", "Scrape endpoint not enabled in this admin console build.", 501);
  });

  app.get("/audit", guard, async (request) => {
    const query = auditQuerySchema.parse(request.query);
    const result = await findAuditLogs({
      action: query.event,
      targetId: query.resource,
      actorUserId: query.userId,
      page: query.page,
      pageSize: query.pageSize,
    });

    return ok(request, {
      items: result.items.map((item) => ({
        timestamp: item.createdAt.toISOString(),
        userId: item.actorUserId,
        event: item.action,
        requestId: item.requestId,
        resource: `${item.targetType}:${item.targetId}`,
      })),
      total: result.total,
      page: query.page,
      pageSize: query.pageSize,
    });
  });
}
