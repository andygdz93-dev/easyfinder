import { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { listings } from "../store.js";
import { getListingsCollection } from "../listings.js";
import { insertAuditEvent } from "../audit.js";
import { fail, ok } from "../response.js";
import { requireNDA } from "../middleware/requireNDA.js";
import { requirePlan } from "../middleware/requirePlan.js";
import { disableWritesInDemo } from "../middleware/disableWritesInDemo.js";
import { getInquiriesCollection, InquiryDocument } from "../inquiries.js";
import { defaultBilling, normalizeBilling } from "../billing.js";
import { getUsersCollection } from "../users.js";
import { getSellerEntitlements } from "../entitlements.js";
import { env } from "../env.js";

const sellerOnly = new Set(["seller", "admin"]);
const uploadRoleAllowed = new Set(["seller", "enterprise", "admin"]);

const requiredImportFields = ["title", "description", "location"] as const;
const importImageFields = ["imageUrl", "imageUrl2", "imageUrl3", "imageUrl4", "imageUrl5"] as const;
const SELLER_IMAGE_PLACEHOLDER = "/demo-images/other/1.jpg";

const importRowSchema = z
  .object({
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    location: z.string().optional(),
    condition: z.string().trim().optional(),
    contactName: z.string().trim().optional(),
    contactEmail: z.string().trim().optional(),
    price: z.union([z.string(), z.number()]).optional(),
    hours: z.union([z.string(), z.number()]).optional(),
    year: z.union([z.string(), z.number()]).optional(),
    make: z.string().optional(),
    model: z.string().optional(),
    category: z.string().optional(),
    imageUrl: z.string().optional(),
    imageUrl2: z.string().optional(),
    imageUrl3: z.string().optional(),
    imageUrl4: z.string().optional(),
    imageUrl5: z.string().optional(),
    contactPhone: z.string().optional(),
    state: z.string().optional(),
  })
  .passthrough();

const listingsImportSchema = z.object({
  rows: z.array(importRowSchema).min(1),
});

const manualListingSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  location: z.string().trim().min(1),
  price: z.union([z.number().finite(), z.null()]).optional(),
  hours: z.union([z.number().finite(), z.null()]).optional(),
  year: z.number().int().finite().optional(),
  make: z.string().trim().optional(),
  model: z.string().trim().optional(),
  category: z.string().trim().optional(),
  condition: z.string().trim().optional(),
  images: z.array(z.string().trim()).max(5).optional(),
});

type IngestionError = { row: number; field?: string; code: string; message: string };

type SellerImportListing = (typeof listings)[number] & {
  id: string;
  status: string;
  isPublished: boolean;
  publishedAt: string;
  updatedAt: string;
  make?: string;
  model?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  location?: string;
  sourceUrl?: string;
};

const toStringValue = (value: unknown) => String(value ?? "").trim();

const parseOptionalNumeric = (
  value: unknown,
  field: "price" | "hours",
  row: number
): { value?: number; error?: IngestionError } => {
  if (value === undefined || value === null) {
    return {};
  }

  const raw = toStringValue(value);
  if (!raw) {
    return {};
  }

  const normalized = raw.replace(/[$,]/g, "").trim();
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return {
      error: {
        row,
        field,
        code: "INVALID_NUMBER",
        message: `${field} must be numeric when provided.`,
      },
    };
  }

  return { value: parsed };
};

const parseOptionalYear = (value: unknown, row: number): { value?: number; error?: IngestionError } => {
  if (value === undefined || value === null) return {};
  const raw = toStringValue(value);
  if (!raw) return {};
  if (!/^-?\d+$/.test(raw)) {
    return {
      error: {
        row,
        field: "year",
        code: "INVALID_INTEGER",
        message: "year must be an integer when provided.",
      },
    };
  }
  const parsed = Number.parseInt(raw, 10);
  return { value: parsed };
};

const isJunkImageUrl = (url: string): boolean => {
  if (!url) return true;
  const normalized = url.toLowerCase();
  if (!/^https?:\/\//i.test(url) && !url.startsWith("/")) return true;
  if (/\.(svg|gif)(\?|#|$)/i.test(normalized)) return true;
  return /(logo|icon|pixel|spacer|sprite|favicon)/i.test(normalized);
};

const normalizeListingImages = (input: unknown[]): { images: string[]; imageUrl: string } => {
  const deduped = Array.from(
    new Set(
      input
        .map((item) => toStringValue(item))
        .filter((url) => url.length > 0)
        .filter((url) => !isJunkImageUrl(url))
    )
  ).slice(0, 5);

  const hero = deduped[0] ?? SELLER_IMAGE_PLACEHOLDER;
  const images = [...deduped];
  while (images.length < 5) {
    images.push(hero);
  }

  return { images, imageUrl: hero };
};

const createSellerListingFromRow = (
  sellerId: string,
  row: Record<string, unknown>,
  rowNumber: number
): { listing?: SellerImportListing; error?: IngestionError } => {
  for (const field of requiredImportFields) {
    if (!toStringValue(row[field])) {
      return {
        error: {
          row: rowNumber,
          field,
          code: "REQUIRED",
          message: `${field} is required.`,
        },
      };
    }
  }

  const normalizedLocation = toStringValue(row.location) || toStringValue(row.state);
  if (!normalizedLocation) {
    return {
      error: {
        row: rowNumber,
        field: "location",
        code: "REQUIRED",
        message: "location is required (location or state column).",
      },
    };
  }

  const rawContactEmail = toStringValue(row.contactEmail);
  const parsedContact = rawContactEmail ? z.string().trim().email().safeParse(rawContactEmail) : null;
  if (parsedContact && !parsedContact.success) {
    return {
      error: {
        row: rowNumber,
        field: "contactEmail",
        code: "INVALID_EMAIL",
        message: "contactEmail must be a valid email address.",
      },
    };
  }

  const parsedPrice = parseOptionalNumeric(row.price, "price", rowNumber);
  if (parsedPrice.error) return { error: parsedPrice.error };

  const parsedHours = parseOptionalNumeric(row.hours, "hours", rowNumber);
  if (parsedHours.error) return { error: parsedHours.error };

  const parsedYear = parseOptionalYear(row.year, rowNumber);
  if (parsedYear.error) return { error: parsedYear.error };

  const imageValues = importImageFields.map((key) => row[key]);
  const { images, imageUrl } = normalizeListingImages(imageValues);

  const now = new Date().toISOString();
  const listingId = `seller:${sellerId}:${randomUUID()}`;
  const sourceExternalId = randomUUID();

  const listing: SellerImportListing = {
    id: listingId,
    title: toStringValue(row.title),
    description: toStringValue(row.description),
    state: normalizedLocation,
    price: parsedPrice.value ?? null,
    hours: parsedHours.value ?? null,
    operable: true,
    is_operable: true,
    year: parsedYear.value,
    condition: 0,
    category: toStringValue(row.category) || "equipment",
    imageUrl,
    images,
    source: `seller:${sellerId}`,
    sourceExternalId,
    sourceUrl: "",
    status: "active",
    isPublished: true,
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
    make: toStringValue(row.make) || undefined,
    model: toStringValue(row.model) || undefined,
    location: normalizedLocation,
    contactName: toStringValue(row.contactName),
    contactEmail: parsedContact?.success ? parsedContact.data : undefined,
    contactPhone: toStringValue(row.contactPhone) || undefined,
  };

  return { listing };
};

const toInquiryDto = (inquiry: InquiryDocument) => ({
  id: inquiry._id.toHexString(),
  listingId: inquiry.listingId,
  buyerName: inquiry.buyerName,
  buyerEmail: inquiry.buyerEmail,
  message: inquiry.message,
  status: inquiry.status,
  createdAt: inquiry.createdAt,
});

export default async function sellerRoutes(app: FastifyInstance) {
  app.get("/listings", { preHandler: [app.authenticate, requireNDA] }, async (request, reply) => {
    if (!uploadRoleAllowed.has(request.user.role)) {
      return fail(request, reply, "FORBIDDEN", "Seller access only.", 403);
    }

    const sellerListings = await getListingsCollection().findSellerListings(request.user.id);

    return ok(request, sellerListings);
  });

  app.post(
    "/listings",
    {
      preHandler: [app.authenticate, requireNDA, requirePlan(["pro", "enterprise"]), disableWritesInDemo],
    },
    async (request, reply) => {
      const payload = manualListingSchema.safeParse(request.body);
      if (!payload.success) {
        reply.status(400);
        return {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid seller listing payload.",
            details: payload.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
          },
          requestId: request.requestId,
        };
      }

      const userId = request.user?.id;
      if (!userId) {
        return fail(request, reply, "UNAUTHORIZED", "Authentication required.", 401);
      }

      const { images, imageUrl } = normalizeListingImages(payload.data.images ?? []);
      const now = new Date().toISOString();
      const externalId = randomUUID();
      const id = `seller:${userId}:${externalId}`;

      const listing: SellerImportListing = {
        id,
        title: payload.data.title.trim(),
        description: payload.data.description.trim(),
        state: payload.data.location.trim(),
        price: payload.data.price ?? null,
        hours: payload.data.hours ?? null,
        operable: true,
        is_operable: true,
        year: payload.data.year,
        condition: 0,
        category: toStringValue(payload.data.category) || "equipment",
        imageUrl,
        images,
        source: `seller:${userId}`,
        sourceExternalId: externalId,
        sourceUrl: "",
        status: "active",
        isPublished: true,
        publishedAt: now,
        createdAt: now,
        updatedAt: now,
        make: toStringValue(payload.data.make) || undefined,
        model: toStringValue(payload.data.model) || undefined,
        location: payload.data.location.trim(),
      };

      await getListingsCollection().insertMany([listing]);

      await insertAuditEvent({
        actorUserId: userId,
        actorEmail: request.user.email,
        action: "SELLER_LISTING_CREATED",
        targetType: "ingestion",
        targetId: `seller:${userId}`,
        after: { id, source: listing.source },
        requestId: request.id,
      });

      return ok(request, listing);
    }
  );

  app.get("/inquiries", { preHandler: app.authenticate }, async (request, reply) => {
    if (!sellerOnly.has(request.user.role)) {
      return fail(request, reply, "FORBIDDEN", "Seller access only.", 403);
    }

    const inquiries = await getInquiriesCollection().findMany();
    inquiries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return ok(
      request,
      inquiries.map((inquiry) => toInquiryDto(inquiry))
    );
  });

  app.get("/insights", { preHandler: [app.authenticate, requireNDA] }, async (request, reply) => {
    if (!sellerOnly.has(request.user.role)) {
      return fail(request, reply, "FORBIDDEN", "Seller access only.", 403);
    }

    const atRiskListings = listings
      .filter((listing) => (listing.hours ?? 0) > 7000 || (listing.price ?? 0) > 220000)
      .slice(0, 5);

    const priceBands = listings.slice(0, 4).map((listing) => ({
      listingId: listing.id,
      range: {
        min: (listing.price ?? 0) * 0.9,
        max: (listing.price ?? 0) * 1.1,
      },
      state: listing.state,
    }));

    const qualityChecklistSummary = {
      total: listings.length,
      missingImages: listings.filter((listing) => !listing.imageUrl).length,
      missingDescriptions: listings.filter((listing) => !listing.description).length,
    };

    return ok(request, {
      atRiskListings,
      priceBands,
      qualityChecklistSummary,
    });
  });

  const createImportHandler = async (request: any, reply: any) => {
    if (!request.user?.id) {
      return fail(request, reply, "UNAUTHORIZED", "Missing user id.", 401);
    }

    const userId = request.user.id;

    if (!uploadRoleAllowed.has(request.user.role)) {
      return fail(request, reply, "FORBIDDEN", "Seller access only.", 403);
    }

    const payload = listingsImportSchema.safeParse(request.body);
    if (!payload.success) {
      return fail(request, reply, "BAD_REQUEST", "rows must be a non-empty array.", 400);
    }

    const seenColumns = new Set<string>();
    payload.data.rows.forEach((row) => {
      Object.keys(row).forEach((key) => seenColumns.add(key));
    });
    const missingColumns = requiredImportFields.filter((field) => !seenColumns.has(field));
    if (missingColumns.length > 0) {
      reply.status(400);
      return {
        error: {
          code: "VALIDATION_ERROR",
          message: `Missing required CSV columns: ${missingColumns.join(", ")}.`,
          details: { missingColumns },
        },
        requestId: request.requestId,
      };
    }

    if (!ObjectId.isValid(userId)) {
      return fail(request, reply, "UNAUTHORIZED", "Authentication required.", 401);
    }

    const user = await getUsersCollection().findOne({ _id: new ObjectId(userId) });
    const billing = normalizeBilling(user?.billing ?? defaultBilling());
    const plan = env.BILLING_STUB_PLAN ?? billing.plan;

    const entitlements = getSellerEntitlements({
      plan,
      role: request.user.role,
      now: new Date(),
    });

    const existingSellerListings = await getListingsCollection().countSellerListings(userId);
    if (
      entitlements.maxActiveListings !== null &&
      existingSellerListings + payload.data.rows.length > entitlements.maxActiveListings
    ) {
      return fail(
        request,
        reply,
        "SELLER_CAP_EXCEEDED",
        `Listing cap exceeded. Pro plan allows up to ${entitlements.maxActiveListings} active listings.`,
        400
      );
    }

    const errors: IngestionError[] = [];
    const createdIds: string[] = [];
    const createdListings: SellerImportListing[] = [];

    payload.data.rows.forEach((row, index) => {
      const rowNumber = index + 2;
      const result = createSellerListingFromRow(userId, row, rowNumber);
      if (result.error) {
        errors.push(result.error);
        return;
      }

      if (result.listing) {
        createdListings.push(result.listing);
        createdIds.push(result.listing.id);
      }
    });

    await getListingsCollection().insertMany(createdListings);

    const liveListingIds = createdListings
      .filter((listing) => String(listing.status ?? "").toLowerCase() === "active" && listing.isPublished !== false)
      .map((listing) => listing.id);

    await insertAuditEvent({
      actorUserId: userId,
      actorEmail: request.user.email,
      action: "SELLER_LISTINGS_IMPORTED",
      targetType: "ingestion",
      targetId: `seller:${userId}`,
      after: {
        created: createdListings.length,
        failed: errors.length,
        createdIds,
        liveListingIds,
      },
      requestId: request.id,
    });

    return ok(request, {
      created: createdListings.length,
      failed: errors.length,
      errors,
      createdIds,
      liveListingIds,
    });
  };

  app.post(
    "/listings/import",
    {
      preHandler: [app.authenticate, requireNDA, requirePlan(["pro", "enterprise"]), disableWritesInDemo],
    },
    createImportHandler
  );

  app.post("/upload", { preHandler: [app.authenticate, requireNDA, requirePlan(["pro", "enterprise"]), disableWritesInDemo] }, createImportHandler);
}
