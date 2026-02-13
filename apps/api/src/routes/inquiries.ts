import { FastifyInstance } from "fastify";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { fail, ok } from "../response.js";
import { getUsersCollection } from "../users.js";
import { getInquiriesCollection, InquiryDocument } from "../inquiries.js";

const buyerOrAdminOnly = new Set(["buyer", "admin"]);

const createInquirySchema = z.object({
  listingId: z.string().min(1),
  message: z.string().min(1).max(2000),
});

const toInquiryDto = (inquiry: InquiryDocument) => ({
  id: inquiry._id.toHexString(),
  listingId: inquiry.listingId,
  buyerName: inquiry.buyerName,
  buyerEmail: inquiry.buyerEmail,
  message: inquiry.message,
  status: inquiry.status,
  createdAt: inquiry.createdAt,
});

export default async function inquiriesRoutes(app: FastifyInstance) {
  app.post("/", { preHandler: app.authenticate }, async (request, reply) => {
    if (!buyerOrAdminOnly.has(request.user.role)) {
      return fail(request, reply, "FORBIDDEN", "Buyer or admin access required.", 403);
    }

    const payload = createInquirySchema.parse(request.body);

    if (!ObjectId.isValid(request.user.id)) {
      return fail(request, reply, "NOT_FOUND", "Buyer not found.", 404);
    }

    const usersCollection = getUsersCollection();
    const buyer = await usersCollection.findOne({ _id: new ObjectId(request.user.id) });
    if (!buyer) {
      return fail(request, reply, "NOT_FOUND", "Buyer not found.", 404);
    }

    const now = new Date();
    const inquiry: InquiryDocument = {
      _id: new ObjectId(),
      listingId: payload.listingId,
      sellerId: null,
      buyerId: request.user.id,
      buyerEmail: buyer.email,
      buyerName: buyer.name,
      message: payload.message,
      status: "new",
      createdAt: now,
      updatedAt: now,
    };

    await getInquiriesCollection().insertOne(inquiry);

    return ok(request, toInquiryDto(inquiry));
  });
}
