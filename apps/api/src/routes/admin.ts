import { ObjectId } from "mongodb";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { ok, fail } from "../response.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { getListingsCollection } from "../listings.js";
import { getInquiriesCollection } from "../inquiries.js";
import { env } from "../env.js";
import { getScoringConfig, setScoringConfig, sourceHealth } from "../store.js";
import { defaultScoringConfig } from "@easyfinderai/shared";
import { findAuditLogs, insertAuditEvent } from "../audit.js";
import { isValidIronPlanetUrl } from "../scrapers/ironplanet.validation.js";
import { scrapeIronPlanetSearch } from "../scrapers/ironplanet.js";

const listingStatuses = ["active", "paused", "removed", "pending_review"] as const;
const inquiryStatuses = ["open", "closed", "spam"] as const;

const listQuerySchema = z.object({
  q: z.string().optional(),
  status: z.enum(listingStatuses).optional(),
  source: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

const listingPatchSchema = z.object({
  status: z.enum(["active", "paused", "removed"]),
  reason: z.string().min(1).optional(),
}).superRefine((value, ctx) => {
  if ((value.status === "paused" || value.status === "removed") && !value.reason) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "reason is required when pausing or removing" });
  }
});

const deleteListingSchema = z.object({
  confirmation: z.string().min(1),
  reason: z.string().min(1),
});

const inquiryPatchSchema = z.object({
  status: z.enum(inquiryStatuses),
  reason: z.string().optional(),
});

const scrapeSchema = z.object({
  url: z.string().min(1),
});

const auditQuerySchema = z.object({
  action: z.string().min(1).optional(),
  targetType: z.enum(["listing", "inquiry", "scoringConfig", "ingestion"]).optional(),
  targetId: z.string().min(1).optional(),
  actorEmail: z.string().email().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

const scoringConfigInput = z.object({
  name: z.string(),
  weights: z.object({
    price: z.number(),
    hours: z.number(),
    year: z.number(),
    location: z.number(),
    condition: z.number(),
    completeness: z.number(),
  }),
  preferredStates: z.array(z.string()),
  minHours: z.number(),
  maxHours: z.number(),
  minPrice: z.number(),
  maxPrice: z.number(),
  minYear: z.number(),
  maxYear: z.number(),
  minCondition: z.number(),
  maxCondition: z.number(),
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
    const [statusCounts, sourceCounts, inquiries] = await Promise.all([
      listingsCollection.getStatusCounts(),
      listingsCollection.getSourceCounts(),
      inquiriesCollection.findMany(),
    ]);

    const inquiriesTotals = {
      total: inquiries.length,
      open: inquiries.filter((x) => x.status !== "closed").length,
      closed: inquiries.filter((x) => x.status === "closed").length,
    };

    const lastIngestion = Array.from(sourceHealth.entries()).reduce<Record<string, string | null>>((acc, [source, info]) => {
      acc[source] = info.lastSync ?? null;
      return acc;
    }, {});

    return ok(request, {
      listings: statusCounts,
      bySource: sourceCounts,
      inquiries: inquiriesTotals,
      lastIngestion,
      demoMode: env.DEMO_MODE,
      billingEnabled: env.BILLING_ENABLED,
    });
  });

  app.get("/listings", guard, async (request) => {
    const query = listQuerySchema.parse(request.query);
    const result = await getListingsCollection().findAdminListings(query);
    return ok(request, { items: result.items, total: result.total, page: query.page, pageSize: query.pageSize });
  });

  app.patch("/listings/:id", guard, async (request, reply) => {
    const { id } = request.params as { id: string };
    const payload = listingPatchSchema.parse(request.body);
    const before = await getListingsCollection().findById(id);
    if (!before) {
      return fail(request, reply, "NOT_FOUND", "Listing not found.", 404);
    }

    await getListingsCollection().updateById(id, { status: payload.status });
    const after = await getListingsCollection().findById(id);

    await insertAuditEvent({
      actorUserId: request.user.id,
      actorEmail: request.user.email,
      action: "LISTING_MODERATED",
      targetType: "listing",
      targetId: id,
      reason: payload.reason,
      before: before as unknown as Record<string, unknown>,
      after: after as unknown as Record<string, unknown>,
      requestId: request.requestId,
    });

    return ok(request, { listing: after });
  });

  app.delete("/listings/:id", guard, async (request, reply) => {
    const { id } = request.params as { id: string };
    const payload = deleteListingSchema.parse(request.body);
    const expectedConfirmation = `DELETE ${id}`;
    if (payload.confirmation !== expectedConfirmation) {
      return fail(request, reply, "BAD_REQUEST", `confirmation must equal \"${expectedConfirmation}\"`, 400);
    }

    const before = await getListingsCollection().findById(id);
    if (!before) {
      return fail(request, reply, "NOT_FOUND", "Listing not found.", 404);
    }

    const result = await getListingsCollection().deleteById(id);
    if (!result.deletedCount) {
      return fail(request, reply, "NOT_FOUND", "Listing not found.", 404);
    }

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
    const query = z.object({ page: z.coerce.number().int().positive().default(1), pageSize: z.coerce.number().int().positive().max(100).default(20), status: z.enum(inquiryStatuses).optional() }).parse(request.query);
    const all = await getInquiriesCollection().findMany();
    const mapped = all.map((inquiry) => ({ ...inquiry, id: inquiry._id.toHexString() }));
    const filtered = query.status ? mapped.filter((inq) => (query.status === "open" ? inq.status !== "closed" : query.status === "closed" ? inq.status === "closed" : inq.status === "reviewing")) : mapped;
    const start = (query.page - 1) * query.pageSize;
    return ok(request, { items: filtered.slice(start, start + query.pageSize), total: filtered.length, page: query.page, pageSize: query.pageSize });
  });

  app.patch("/inquiries/:id", guard, async (request, reply) => {
    const { id } = request.params as { id: string };
    const payload = inquiryPatchSchema.parse(request.body);
    const before = await getInquiriesCollection().findById(id);
    if (!before) {
      return fail(request, reply, "NOT_FOUND", "Inquiry not found.", 404);
    }

    const updateResult = await getInquiriesCollection().updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: toInquiryStatus(payload.status) } }
    );

    if (!updateResult.matchedCount) {
      return fail(request, reply, "NOT_FOUND", "Inquiry not found.", 404);
    }

    const after = await getInquiriesCollection().findById(id);

    await insertAuditEvent({
      actorUserId: request.user.id,
      actorEmail: request.user.email,
      action: "INQUIRY_STATUS_UPDATED",
      targetType: "inquiry",
      targetId: id,
      reason: payload.reason,
      before: before as unknown as Record<string, unknown>,
      after: (after ?? undefined) as unknown as Record<string, unknown>,
      requestId: request.requestId,
    });

    return ok(request, { inquiry: after });
  });

  app.get("/scoring-config", guard, async (request) => {
    return ok(request, { config: getScoringConfig() });
  });

  app.post("/scoring-config", guard, async (request) => {
    const payload = scoringConfigInput.parse(request.body);
    const before = getScoringConfig();
    const next = {
      ...defaultScoringConfig,
      ...payload,
      id: defaultScoringConfig.id,
      active: true,
    };
    setScoringConfig(next);

    await insertAuditEvent({
      actorUserId: request.user.id,
      actorEmail: request.user.email,
      action: "SCORING_CONFIG_REPLACED",
      targetType: "scoringConfig",
      targetId: "active",
      before: before as unknown as Record<string, unknown>,
      after: next as unknown as Record<string, unknown>,
      requestId: request.requestId,
    });

    return ok(request, { config: next });
  });

  app.get("/audit", guard, async (request) => {
    const query = auditQuerySchema.parse(request.query);
    const result = await findAuditLogs(query);
    return ok(request, {
      items: result.items.map((item) => ({
        id: item.id,
        actorUserId: item.actorUserId,
        actorEmail: item.actorEmail,
        action: item.action,
        targetType: item.targetType,
        targetId: item.targetId,
        reason: item.reason,
        before: item.before,
        after: item.after,
        requestId: item.requestId,
        createdAt: item.createdAt.toISOString(),
      })),
      total: result.total,
      page: query.page,
      pageSize: query.pageSize,
    });
  });

  app.post("/scrape/ironplanet", guard, async (request, reply) => {
    const payload = scrapeSchema.parse(request.body);
    if (!isValidIronPlanetUrl(payload.url)) {
      return fail(request, reply, "INVALID_URL", "Invalid IronPlanet URL", 400);
    }

    const summary = await scrapeIronPlanetSearch(payload.url);
    await insertAuditEvent({
      actorUserId: request.user.id,
      actorEmail: request.user.email,
      action: "IRONPLANET_SCRAPE_TRIGGERED",
      targetType: "ingestion",
      targetId: payload.url,
      after: summary as unknown as Record<string, unknown>,
      requestId: request.requestId,
    });

    return ok(request, summary);
  });
}
