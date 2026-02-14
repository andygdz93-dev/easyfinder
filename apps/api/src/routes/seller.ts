import { FastifyInstance } from "fastify";
import { ObjectId } from "mongodb";
import { nanoid } from "nanoid";
import { z } from "zod";
import { listings } from "../store.js";
import { fail, ok } from "../response.js";
import { requireNDA } from "../middleware/requireNDA.js";
import { getInquiriesCollection, InquiryDocument } from "../inquiries.js";
import { defaultBilling, normalizeBilling } from "../billing.js";
import { getUsersCollection } from "../users.js";
import { getSellerEntitlements } from "../entitlements.js";
import { env } from "../env.js";

const sellerOnly = new Set(["seller", "admin"]);
const uploadRoleAllowed = new Set(["seller", "enterprise"]);

const uploadSchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())).min(1),
});

const conditionScoreByLabel: Record<string, number> = {
  excellent: 4,
  good: 3,
  fair: 2,
  needs_repair: 1,
};

const requiredFields = ["title", "make", "model", "year", "state", "condition", "description"] as const;

const toStringValue = (value: unknown) => String(value ?? "").trim();

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

  app.post("/upload", { preHandler: [app.authenticate, requireNDA] }, async (request, reply) => {
    if (!uploadRoleAllowed.has(request.user.role)) {
      return fail(request, reply, "FORBIDDEN", "Seller access only.", 403);
    }

    const payload = uploadSchema.safeParse(request.body);
    if (!payload.success) {
      return fail(request, reply, "BAD_REQUEST", "rows must be a non-empty array.", 400);
    }

    if (!ObjectId.isValid(request.user.id)) {
      return fail(request, reply, "UNAUTHORIZED", "Authentication required.", 401);
    }

    const user = await getUsersCollection().findOne({ _id: new ObjectId(request.user.id) });
    const billing = normalizeBilling(user?.billing ?? defaultBilling());
    const plan = env.BILLING_STUB_PLAN ?? billing.plan;

    const entitlements = getSellerEntitlements({
      plan,
      role: request.user.role,
      now: new Date(),
    });

    if (!entitlements.csvUpload) {
      return fail(request, reply, "FORBIDDEN", "CSV upload requires a Pro or Enterprise seller plan.", 403);
    }

    const existingSellerListings = listings.filter((listing) => listing.source === `seller:${request.user.id}`).length;
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
    let created = 0;

    payload.data.rows.forEach((row, index) => {
      const rowNumber = index + 2;

      for (const field of requiredFields) {
        if (!toStringValue(row[field])) {
          errors.push({ row: rowNumber, message: `${field} is required.` });
          return;
        }
      }

      const year = Number.parseInt(toStringValue(row.year), 10);
      if (!Number.isInteger(year)) {
        errors.push({ row: rowNumber, message: "year must be an integer." });
        return;
      }

      const hoursRaw = toStringValue(row.hours);
      const priceRaw = toStringValue(row.price);
      const hours = hoursRaw ? Number(hoursRaw) : 0;
      const price = priceRaw ? Number(priceRaw) : 0;
      if (Number.isNaN(hours)) {
        errors.push({ row: rowNumber, message: "hours must be numeric when provided." });
        return;
      }
      if (Number.isNaN(price)) {
        errors.push({ row: rowNumber, message: "price must be numeric when provided." });
        return;
      }

      const conditionLabel = toStringValue(row.condition);
      const condition = conditionScoreByLabel[conditionLabel];
      if (!condition) {
        errors.push({ row: rowNumber, message: "condition must be one of excellent|good|fair|needs_repair." });
        return;
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

      listings.push({
        id: `seller-${nanoid(10)}`,
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
        source: `seller:${request.user.id}`,
        createdAt: new Date().toISOString(),
      });
      created += 1;
    });

    return ok(request, {
      created,
      failed: errors.length,
      errors,
    });
  });
}
