import { FastifyInstance } from "fastify";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { listings } from "../store.js";
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

const importRowSchema = z.object({
  title: z.string().trim().min(1),
  make: z.string().trim().min(1),
  model: z.string().trim().min(1),
  year: z.union([z.string(), z.number()]).optional(),
  hours: z.union([z.string(), z.number()]).optional(),
  price: z.union([z.string(), z.number()]).optional(),
  condition: z.string().trim().min(1),
  state: z.string().trim().min(1),
  description: z.string().trim().min(1),
  image1: z.string().optional(),
  image2: z.string().optional(),
  image3: z.string().optional(),
  image4: z.string().optional(),
  image5: z.string().optional(),
});

const listingsImportSchema = z.object({
  rows: z.array(importRowSchema).min(1),
});

const conditionScoreByLabel: Record<string, number> = {
  excellent: 4,
  good: 3,
  fair: 2,
  needs_repair: 1,
};

const requiredFields = ["title", "make", "model", "year", "state", "condition", "description"] as const;

type SellerImportListing = (typeof listings)[number] & {
  id: string;
  status: string;
  isPublished: boolean;
  publishedAt: string;
  updatedAt: string;
  make: string;
  model: string;
};

const toStringValue = (value: unknown) => String(value ?? "").trim();

const createSellerListingFromRow = (
  sellerId: string,
  row: Record<string, unknown>,
  rowNumber: number
): { listing?: SellerImportListing; error?: { row: number; message: string } } => {
  for (const field of requiredFields) {
    if (!toStringValue(row[field])) {
      return { error: { row: rowNumber, message: `${field} is required.` } };
    }
  }

  const year = Number.parseInt(toStringValue(row.year), 10);
  if (!Number.isInteger(year)) {
    return { error: { row: rowNumber, message: "year must be an integer." } };
  }

  const hoursRaw = toStringValue(row.hours);
  const priceRaw = toStringValue(row.price);
  const hours = hoursRaw ? Number(hoursRaw) : 0;
  const price = priceRaw ? Number(priceRaw) : 0;
  if (Number.isNaN(hours)) {
    return { error: { row: rowNumber, message: "hours must be numeric when provided." } };
  }
  if (Number.isNaN(price)) {
    return { error: { row: rowNumber, message: "price must be numeric when provided." } };
  }

  const conditionLabel = toStringValue(row.condition);
  const condition = conditionScoreByLabel[conditionLabel];
  if (!condition) {
    return {
      error: {
        row: rowNumber,
        message: "condition must be one of excellent|good|fair|needs_repair.",
      },
    };
  }

  const imageFields = ["image1", "image2", "image3", "image4", "image5"] as const;
  const providedImages = imageFields
    .map((key) => toStringValue(row[key]))
    .filter((value) => value.length > 0);

  const fallbackImages = [
    "/demo-images/placeholder-1.jpg",
    "/demo-images/placeholder-2.jpg",
    "/demo-images/placeholder-3.jpg",
    "/demo-images/placeholder-4.jpg",
    "/demo-images/placeholder-5.jpg",
  ];

  const images = [...providedImages, ...fallbackImages].slice(0, 5);
  const now = new Date().toISOString();
  const listingId = new ObjectId().toHexString();

  const listing: SellerImportListing = {
    id: listingId,
    title: toStringValue(row.title),
    description: toStringValue(row.description),
    state: toStringValue(row.state),
    price,
    hours,
    operable: true,
    is_operable: true,
    year,
    condition,
    category: toStringValue(row.make) || "equipment",
    imageUrl: images[0],
    images,
    source: `seller:${sellerId}`,
    status: "active",
    isPublished: true,
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
    make: toStringValue(row.make),
    model: toStringValue(row.model),
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

    const sellerSource = `seller:${request.user.id}`;
    const sellerListings = listings
      .filter((listing) => listing.source === sellerSource)
      .sort(
        (a, b) =>
          new Date((b as any).updatedAt ?? b.createdAt).getTime() -
          new Date((a as any).updatedAt ?? a.createdAt).getTime()
      );

    return ok(request, sellerListings);
  });

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

    const existingSellerListings = listings.filter((listing) => listing.source === `seller:${userId}`).length;
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

    const errors: Array<{ row: number; message: string }> = [];
    const createdIds: string[] = [];
    let created = 0;

    payload.data.rows.forEach((row, index) => {
      const rowNumber = index + 2;
      const result = createSellerListingFromRow(userId, row, rowNumber);
      if (result.error) {
        errors.push(result.error);
        return;
      }

      if (result.listing) {
        listings.push(result.listing);
        createdIds.push(result.listing.id);
        created += 1;
      }
    });

    const liveListingIds = createdIds.filter((id) => {
      const listing = listings.find((candidate) => candidate.id === id) as
        | ((typeof listings)[number] & { status?: string; isPublished?: boolean })
        | undefined;
      if (!listing) return false;
      return String(listing.status ?? "").toLowerCase() === "active" && listing.isPublished !== false;
    });

    return ok(request, {
      created,
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
