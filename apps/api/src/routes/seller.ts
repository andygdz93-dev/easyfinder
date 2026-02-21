import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { ObjectId } from "mongodb";
import { parse as parseCsv } from "csv-parse/sync";
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
import { uploadImageToGridFs } from "../gridfs-images.js";
import { parseZipBundle, parseZipImageArchive } from "../zipBundle.js";
import { getContactBlockReason } from "../lib/contactInfoBlocker.js";

const sellerOnly = new Set(["seller", "admin"]);
const uploadRoleAllowed = new Set(["seller", "enterprise", "admin"]);

const requiredImportFields = ["title", "description", "location"] as const;
const importImageFields = ["imageUrl", "imageUrl2", "imageUrl3", "imageUrl4", "imageUrl5"] as const;
const SELLER_IMAGE_PLACEHOLDER = "/demo-images/other/1.jpg";

const apiBaseUrl = (env.PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");

const toAbsoluteImageUrl = (url: string): string => {
  if (!apiBaseUrl) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${apiBaseUrl}${url}`;
  return `${apiBaseUrl}/${url}`;
};

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

const sellerListingUpdateSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().min(1).optional(),
    location: z.string().trim().min(1).optional(),
    state: z.string().trim().min(1).optional(),
    price: z.union([z.number().finite(), z.null()]).optional(),
    hours: z.union([z.number().finite(), z.null()]).optional(),
    year: z.number().int().finite().optional(),
    make: z.string().trim().optional(),
    model: z.string().trim().optional(),
    category: z.string().trim().optional(),
    condition: z.string().trim().optional(),
    imageUrl: z.string().trim().optional(),
    images: z.array(z.string().trim()).max(5).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });


type IngestionError = { row: number; field?: string; code: string; message: string };

type UploadValidationSummary = {
  rowsDetected: number;
  validRows: number;
  invalidRows: number;
  totalValidationErrors: number;
  topErrors: string[];
};

type ZipImageEntry = { fileName: string; data: Buffer; fileId?: ObjectId };

type SellerImportListing = (typeof listings)[number] & {
  id: string;
  status: string;
  isPublished: boolean;
  publishedAt: string;
  updatedAt: string;
  sourceExternalId?: string;
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

const toStoredImageUrl = (url: string): string => {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

const normalizeListingImages = (input: unknown[]): { images: string[]; imageUrl: string } => {
  const deduped = Array.from(
    new Set(
      input
        .map((item) => toStringValue(item))
        .filter((url) => url.length > 0)
        .filter((url) => !isJunkImageUrl(url))
        .map((url) => toStoredImageUrl(url))
    )
  ).slice(0, 5);

  const hero = deduped[0] ?? toStoredImageUrl(SELLER_IMAGE_PLACEHOLDER);
  const images = [...deduped];
  while (images.length < 5) {
    images.push(hero);
  }

  return { images, imageUrl: hero };
};

const normalizeListingForResponse = <T extends { imageUrl?: string; images?: string[] }>(listing: T): T => {
  const normalized = normalizeListingImages([listing.imageUrl, ...(listing.images ?? [])]);
  return {
    ...listing,
    imageUrl: toAbsoluteImageUrl(normalized.imageUrl),
    images: normalized.images.map((url) => toAbsoluteImageUrl(url)),
  };
};

const getZipImageContentType = (fileName: string) => {
  const extension = extname(fileName).replace(/^\./, "").toLowerCase();
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return "application/octet-stream";
};

const normalizeZipImageKey = (rawValue: string): string | null => {
  const match = rawValue
    .trim()
    .match(/^(\d+)\s*[-_ ]?\s*([A-E])(?:\.(jpg|jpeg|png|webp))?$/i);
  if (!match) return null;
  return `${Number.parseInt(match[1], 10)}${match[2].toUpperCase()}`;
};

const buildValidationSummary = (
  rows: Record<string, unknown>[],
  sellerId: string,
  zipImagesByKey?: Map<string, ZipImageEntry>
): { summary: UploadValidationSummary; errors: IngestionError[] } => {
  const errors: IngestionError[] = [];
  let validRows = 0;
  let invalidRows = 0;

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;
    const result = createSellerListingFromRow(sellerId, row, rowNumber, zipImagesByKey);
    if (result.error) {
      invalidRows += 1;
      errors.push(result.error);
    } else {
      validRows += 1;
    }
  }

  return {
    summary: {
      rowsDetected: rows.length,
      validRows,
      invalidRows,
      totalValidationErrors: errors.length,
      topErrors: errors.slice(0, 12).map((error) => {
        const fieldPrefix = error.field ? `${error.field}: ` : "";
        return `Row ${error.row} • ${fieldPrefix}${error.message}`;
      }),
    },
    errors,
  };
};

const parseCsvRowsFromZipBundle = (
  bundleZipBuffer: Buffer
): {
  rows: Record<string, unknown>[];
  zipImagesByKey: Map<string, ZipImageEntry>;
  invalidImageNames: string[];
} => {
  const parsedBundle = parseZipBundle(bundleZipBuffer);
  const rows = parseCsv(parsedBundle.csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  }) as Record<string, unknown>[];

  return {
    rows,
    zipImagesByKey: parsedBundle.imagesByKey,
    invalidImageNames: parsedBundle.invalidImageNames,
  };
};

const createSellerListingFromRow = (
  sellerId: string,
  row: Record<string, unknown>,
  rowNumber: number,
  zipImagesByKey?: Map<string, ZipImageEntry>
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

  const imageValues = importImageFields.map((key, index) => {
    const rawValue = toStringValue(row[key]);
    if (/^https?:\/\//i.test(rawValue)) {
      return rawValue;
    }

    if (!rawValue || !zipImagesByKey) {
      return "";
    }

    const slotLetter = String.fromCharCode("A".charCodeAt(0) + index);
    const normalizedFromValue = normalizeZipImageKey(rawValue);
    const zipImage =
      (normalizedFromValue ? zipImagesByKey.get(normalizedFromValue) : undefined) ??
      zipImagesByKey.get(`${rowNumber}${slotLetter}`);
    if (!zipImage) {
      return "";
    }

    return zipImage.fileId ? `/api/images/${zipImage.fileId.toHexString()}` : "";
  });
  const { images, imageUrl } = normalizeListingImages(imageValues);

  const now = new Date().toISOString();
  const listingId = `seller:${sellerId}:${randomUUID()}`;

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

const toInquiryDto = (inquiry: InquiryDocument, listingTitle: string | null) => ({
  id: inquiry._id.toHexString(),
  listingId: inquiry.listingId,
  listingTitle,
  buyerId: inquiry.buyerId,
  messagePreview: inquiry.messages?.[inquiry.messages.length - 1]?.body ?? inquiry.message,
  status: inquiry.status,
  createdAt: inquiry.createdAt,
});

const toThreadMessages = (inquiry: InquiryDocument) => {
  const initial = {
    id: `${inquiry._id.toHexString()}-initial`,
    senderRole: "buyer" as const,
    body: inquiry.message,
    createdAt: inquiry.createdAt,
  };

  return [initial, ...(inquiry.messages ?? [])].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
};

export default async function sellerRoutes(app: FastifyInstance) {
  app.get("/listings", { preHandler: [app.authenticate, requireNDA] }, async (request, reply) => {
    if (!uploadRoleAllowed.has(request.user.role)) {
      return fail(request, reply, "FORBIDDEN", "Seller access only.", 403);
    }

    const sellerListings = await getListingsCollection().findSellerListings(request.user.id);

    return ok(request, sellerListings.map((listing) => normalizeListingForResponse(listing)));
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

      return ok(request, normalizeListingForResponse(listing));
    }
  );

  app.get("/listings/:id", { preHandler: [app.authenticate, requireNDA] }, async (request, reply) => {
    if (!sellerOnly.has(request.user.role)) {
      return fail(request, reply, "FORBIDDEN", "Seller access only.", 403);
    }

    const { id } = request.params as { id: string };
    const listing = await getListingsCollection().findById(id);
    if (!listing) {
      return fail(request, reply, "NOT_FOUND", "Listing not found.", 404);
    }

    const isAdmin = request.user.role === "admin";
    if (!isAdmin && listing.source !== `seller:${request.user.id}`) {
      return fail(request, reply, "FORBIDDEN", "You do not have access to this listing.", 403);
    }

    return ok(request, normalizeListingForResponse(listing));
  });

  const updateListingHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!sellerOnly.has(request.user.role)) {
      return fail(request, reply, "FORBIDDEN", "Seller access only.", 403);
    }

    const payload = sellerListingUpdateSchema.safeParse(request.body);
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

    const { id } = request.params as { id: string };
    const existing = await getListingsCollection().findById(id);
    if (!existing) {
      return fail(request, reply, "NOT_FOUND", "Listing not found.", 404);
    }

    const isAdmin = request.user.role === "admin";
    if (!isAdmin && existing.source !== `seller:${request.user.id}`) {
      return fail(request, reply, "FORBIDDEN", "You do not have access to this listing.", 403);
    }

    const updateDoc: Partial<SellerImportListing> = {};
    const data = payload.data;

    if (data.title !== undefined) updateDoc.title = data.title.trim();
    if (data.description !== undefined) updateDoc.description = data.description.trim();
    if (data.location !== undefined) {
      updateDoc.location = data.location.trim();
      updateDoc.state = data.location.trim();
    }
    if (data.state !== undefined) updateDoc.state = data.state.trim();
    if (data.price !== undefined) updateDoc.price = data.price;
    if (data.hours !== undefined) updateDoc.hours = data.hours;
    if (data.year !== undefined) updateDoc.year = data.year;
    if (data.make !== undefined) updateDoc.make = toStringValue(data.make) || undefined;
    if (data.model !== undefined) updateDoc.model = toStringValue(data.model) || undefined;
    if (data.category !== undefined) updateDoc.category = toStringValue(data.category) || "equipment";
    if (data.condition !== undefined) updateDoc.condition = 0;

    if (data.imageUrl !== undefined) {
      const { images, imageUrl } = normalizeListingImages([data.imageUrl]);
      updateDoc.images = images;
      updateDoc.imageUrl = imageUrl;
    }

    if (data.images !== undefined) {
      const { images, imageUrl } = normalizeListingImages(data.images);
      updateDoc.images = images;
      updateDoc.imageUrl = imageUrl;
    }

    await getListingsCollection().updateById(id, updateDoc);
    const updated = await getListingsCollection().findById(id);
    return ok(request, updated ? normalizeListingForResponse(updated) : updated);
  };

  app.put(
    "/listings/:id",
    {
      preHandler: [app.authenticate, requireNDA, disableWritesInDemo],
    },
    updateListingHandler
  );

  app.patch(
    "/listings/:id",
    {
      preHandler: [app.authenticate, requireNDA, disableWritesInDemo],
    },
    updateListingHandler
  );

  app.delete(
    "/listings/:id",
    {
      preHandler: [app.authenticate, requireNDA, disableWritesInDemo],
    },
    async (request, reply) => {
      if (!sellerOnly.has(request.user.role)) {
        return fail(request, reply, "FORBIDDEN", "Seller access only.", 403);
      }

      const { id } = request.params as { id: string };
      const existing = await getListingsCollection().findById(id);
      if (!existing) {
        return fail(request, reply, "NOT_FOUND", "Listing not found.", 404);
      }

      const isAdmin = request.user.role === "admin";
      if (!isAdmin && existing.source !== `seller:${request.user.id}`) {
        return fail(request, reply, "FORBIDDEN", "You do not have access to this listing.", 403);
      }

      const result = await getListingsCollection().deleteById(id);
      if (!result.deletedCount) {
        return fail(request, reply, "NOT_FOUND", "Listing not found.", 404);
      }

      await insertAuditEvent({
        actorUserId: request.user.id,
        actorEmail: request.user.email,
        action: "SELLER_LISTING_DELETED",
        targetType: "listing",
        targetId: id,
        before: { id, source: existing.source },
        after: null,
        requestId: request.requestId,
      });

      return ok(request, { id });
    }
  );

  app.get("/inquiries", { preHandler: app.authenticate }, async (request, reply) => {
    if (!sellerOnly.has(request.user.role)) {
      return fail(request, reply, "FORBIDDEN", "Seller access only.", 403);
    }

    const inquiries = await getInquiriesCollection().findMany();
    inquiries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const listingTitles = new Map<string, string>();
    await Promise.all(
      Array.from(new Set(inquiries.map((inquiry) => inquiry.listingId))).map(async (listingId) => {
        const listing = await getListingsCollection().findById(listingId);
        if (listing?.title) {
          listingTitles.set(listingId, listing.title);
        }
      })
    );

    return ok(
      request,
      inquiries.map((inquiry) => toInquiryDto(inquiry, listingTitles.get(inquiry.listingId) ?? null))
    );
  });

  app.get("/inquiries/:id", { preHandler: app.authenticate }, async (request, reply) => {
    if (!sellerOnly.has(request.user.role)) {
      return fail(request, reply, "FORBIDDEN", "Seller access only.", 403);
    }

    const { id } = request.params as { id: string };
    const inquiry = await getInquiriesCollection().findById(id);
    if (!inquiry) {
      return fail(request, reply, "NOT_FOUND", "Inquiry not found.", 404);
    }

    const listing = await getListingsCollection().findById(inquiry.listingId);

    return ok(request, {
      id: inquiry._id.toHexString(),
      listingId: inquiry.listingId,
      listingTitle: listing?.title ?? null,
      buyerId: inquiry.buyerId,
      status: inquiry.status,
      createdAt: inquiry.createdAt,
      messages: toThreadMessages(inquiry),
    });
  });

  app.post("/inquiries/:id/messages", { preHandler: app.authenticate }, async (request, reply) => {
    if (!sellerOnly.has(request.user.role)) {
      return fail(request, reply, "FORBIDDEN", "Seller access only.", 403);
    }

    const { id } = request.params as { id: string };
    const rawBody = typeof (request.body as { body?: unknown })?.body === "string"
      ? (request.body as { body: string }).body
      : "";
    const body = rawBody.trim();

    if (!body) {
      return fail(request, reply, "BAD_REQUEST", "Message body is required.", 400);
    }

    if (body.length > 2000) {
      return fail(request, reply, "BAD_REQUEST", "Message body must be 2000 characters or less.", 400);
    }

    const inquiry = await getInquiriesCollection().findById(id);
    if (!inquiry) {
      return fail(request, reply, "NOT_FOUND", "Inquiry not found.", 404);
    }

    const reasonType = getContactBlockReason(body);
    if (reasonType) {
      await insertAuditEvent({
        actorUserId: request.user.id,
        actorEmail: request.user.email,
        action: "MESSAGE_BLOCKED",
        targetType: "inquiry",
        targetId: inquiry._id.toHexString(),
        reason: reasonType,
        before: null,
        after: {
          inquiryId: inquiry._id.toHexString(),
          sellerId: inquiry.sellerId,
          buyerId: inquiry.buyerId,
          reasonType,
        },
        requestId: request.requestId,
      });

      return fail(
        request,
        reply,
        "CONTACT_INFO_BLOCKED",
        "For safety, don’t share phone numbers, emails, or social handles. Use EasyFinder messaging only.",
        400
      );
    }

    const now = new Date();
    const nextMessages = [
      ...(inquiry.messages ?? []),
      {
        id: randomUUID(),
        senderRole: "seller" as const,
        body,
        createdAt: now,
      },
    ];

    await getInquiriesCollection().updateOne(
      { _id: inquiry._id },
      {
        $set: {
          messages: nextMessages,
          updatedAt: now,
        },
      }
    );

    const updated = await getInquiriesCollection().findById(id);
    return ok(request, {
      id: inquiry._id.toHexString(),
      messages: toThreadMessages(updated ?? { ...inquiry, messages: nextMessages }),
    });
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

    let body = request.body;
    let zipImagesByKey: Map<string, ZipImageEntry> | undefined = request.zipImagesByKey;
    const zipWarnings: string[] = Array.isArray(request.zipWarnings) ? request.zipWarnings : [];

    if (request.isMultipart() && !(body && Array.isArray(body.rows))) {
      let csvBuffer: Buffer | null = null;
      let imagesZipBuffer: Buffer | null = null;

      const parts = request.parts();
      for await (const part of parts) {
        if (part.type !== "file") continue;
        if (part.fieldname === "csv") {
          csvBuffer = await part.toBuffer();
          continue;
        }

        if (part.fieldname === "imagesZip") {
          imagesZipBuffer = await part.toBuffer();
        }
      }

      if (!csvBuffer) {
        return fail(request, reply, "BAD_REQUEST", "Missing required file field named 'csv'.", 400);
      }

      const csvRows = parseCsv(csvBuffer.toString("utf8"), {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      }) as Record<string, unknown>[];

      body = { rows: csvRows };

      if (imagesZipBuffer) {
        try {
          zipImagesByKey = parseZipImageArchive(imagesZipBuffer).imagesByKey;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unable to parse images ZIP.";
          return fail(request, reply, "BAD_REQUEST", message, 400);
        }
      }
    }

    const payload = listingsImportSchema.safeParse(body);
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

    const errors: IngestionError[] = zipWarnings.map((message) => ({ row: 0, code: "ZIP_WARNING", message }));
    const createdIds: string[] = [];
    const createdListings: SellerImportListing[] = [];

    for (const [index, row] of payload.data.rows.entries()) {
      const rowNumber = index + 2;
      if (zipImagesByKey) {
        for (let imageIndex = 0; imageIndex < importImageFields.length; imageIndex += 1) {
          const field = importImageFields[imageIndex];
          const rawValue = toStringValue(row[field]);
          if (!rawValue || /^https?:\/\//i.test(rawValue)) {
            continue;
          }

          const slotLetter = String.fromCharCode("A".charCodeAt(0) + imageIndex);
          const normalizedFromValue = normalizeZipImageKey(rawValue);
          const key = normalizedFromValue ?? `${rowNumber}${slotLetter}`;
          const zipImage = zipImagesByKey.get(key) ?? zipImagesByKey.get(`${rowNumber}${slotLetter}`);
          if (!zipImage || zipImage.fileId) {
            continue;
          }

          const fileId = await uploadImageToGridFs({
            buffer: zipImage.data,
            filename: zipImage.fileName,
            contentType: getZipImageContentType(zipImage.fileName),
            metadata: {
              ownerUserId: request.user.id,
              uploadedAt: new Date().toISOString(),
            },
          });
          zipImage.fileId = fileId;
        }
      }

      const result = createSellerListingFromRow(userId, row, rowNumber, zipImagesByKey);
      if (result.error) {
        errors.push(result.error);
        continue;
      }

      if (result.listing) {
        createdListings.push(result.listing);
        createdIds.push(result.listing.id);
      }
    }

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
    "/images",
    {
      preHandler: [app.authenticate, requireNDA, disableWritesInDemo],
    },
    async (request, reply) => {
      if (!sellerOnly.has(request.user.role)) {
        return fail(request, reply, "FORBIDDEN", "Seller role required.", 403);
      }

      const parts = request.files();
      const imageUrls: string[] = [];

      for await (const part of parts) {
        if (part.fieldname !== "images") {
          return fail(request, reply, "BAD_REQUEST", "Only field 'images' is allowed.", 400);
        }

        if (!part.mimetype?.toLowerCase().startsWith("image/")) {
          return fail(request, reply, "BAD_REQUEST", "Only image uploads are allowed.", 400);
        }

        if (imageUrls.length >= 5) {
          return fail(request, reply, "BAD_REQUEST", "Maximum of 5 images allowed.", 400);
        }

        const buffer = await part.toBuffer();
        const imageId = await uploadImageToGridFs({
          buffer,
          filename: part.filename || "image",
          contentType: part.mimetype,
          metadata: {
            contentType: part.mimetype,
            ownerUserId: request.user.id,
            uploadedAt: new Date().toISOString(),
          },
        });

        imageUrls.push(`/api/images/${imageId.toHexString()}`);
      }

      if (imageUrls.length === 0) {
        return fail(request, reply, "BAD_REQUEST", "Missing file field named 'images'.", 400);
      }

      return ok(request, { images: imageUrls });
    }
  );

  app.post(
    "/listings/import",
    {
      preHandler: [app.authenticate, requireNDA, requirePlan(["pro", "enterprise"]), disableWritesInDemo],
    },
    createImportHandler
  );

  app.post(
    "/upload/validate-zip",
    {
      preHandler: [app.authenticate, requireNDA, requirePlan(["pro", "enterprise"]), disableWritesInDemo],
    },
    async (request, reply) => {
      if (!request.user?.id) {
        return fail(request, reply, "UNAUTHORIZED", "Missing user id.", 401);
      }

      if (!uploadRoleAllowed.has(request.user.role)) {
        return fail(request, reply, "FORBIDDEN", "Seller access only.", 403);
      }

      if (!request.isMultipart()) {
        return fail(request, reply, "BAD_REQUEST", "Expected multipart form data.", 400);
      }

      let bundleZipBuffer: Buffer | null = null;
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === "file" && part.fieldname === "zip") {
          bundleZipBuffer = await part.toBuffer();
          break;
        }
      }

      if (!bundleZipBuffer) {
        return fail(request, reply, "BAD_REQUEST", "Missing required file field named 'zip'.", 400);
      }

      let rows: Record<string, unknown>[];
      let zipImagesByKey: Map<string, ZipImageEntry>;
      let invalidImageNames: string[] = [];
      try {
        const parsed = parseCsvRowsFromZipBundle(bundleZipBuffer);
        rows = parsed.rows;
        zipImagesByKey = parsed.zipImagesByKey;
        invalidImageNames = parsed.invalidImageNames;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to parse ZIP bundle.";
        return fail(request, reply, "BAD_REQUEST", message, 400);
      }

      const payload = listingsImportSchema.safeParse({ rows });
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

      const { summary } = buildValidationSummary(payload.data.rows, request.user.id, zipImagesByKey);
      if (invalidImageNames.length > 0) {
        summary.topErrors = [
          `Images skipped due to invalid filename format: ${invalidImageNames.slice(0, 8).join(", ")}`,
          ...summary.topErrors,
        ].slice(0, 12);
      }
      return ok(request, summary);
    }
  );

  app.post(
    "/upload/upload-zip",
    {
      preHandler: [app.authenticate, requireNDA, requirePlan(["pro", "enterprise"]), disableWritesInDemo],
    },
    async (request, reply) => {
      if (!request.isMultipart()) {
        return fail(request, reply, "BAD_REQUEST", "Expected multipart form data.", 400);
      }

      let bundleZipBuffer: Buffer | null = null;
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === "file" && part.fieldname === "zip") {
          bundleZipBuffer = await part.toBuffer();
          break;
        }
      }

      if (!bundleZipBuffer) {
        return fail(request, reply, "BAD_REQUEST", "Missing required file field named 'zip'.", 400);
      }

      let rows: Record<string, unknown>[];
      let zipImagesByKey: Map<string, ZipImageEntry>;
      let invalidImageNames: string[] = [];
      try {
        const parsed = parseCsvRowsFromZipBundle(bundleZipBuffer);
        rows = parsed.rows;
        zipImagesByKey = parsed.zipImagesByKey;
        invalidImageNames = parsed.invalidImageNames;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to parse ZIP bundle.";
        return fail(request, reply, "BAD_REQUEST", message, 400);
      }

      request.body = { rows };
      (request as typeof request & {
        zipImagesByKey?: Map<string, ZipImageEntry>;
        zipWarnings?: string[];
      }).zipImagesByKey = zipImagesByKey;
      (request as typeof request & { zipWarnings?: string[] }).zipWarnings = invalidImageNames.length
        ? [`Images skipped due to invalid filename format: ${invalidImageNames.slice(0, 8).join(", ")}`]
        : [];
      return createImportHandler(request, reply);
    }
  );

  app.post("/upload", { preHandler: [app.authenticate, requireNDA, requirePlan(["pro", "enterprise"]), disableWritesInDemo] }, createImportHandler);
}
