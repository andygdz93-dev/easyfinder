import { FastifyInstance } from "fastify";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { sendOfferStatusEmail } from "../email.js";
import { getListingsCollection } from "../listings.js";
import {
  getOffersCollection,
  OfferDocument,
  OfferHistoryEntry,
  OfferHistoryType,
  OfferStatus,
} from "../offers.js";
import { fail, ok } from "../response.js";
import { getUsersCollection } from "../users.js";
import { audit } from "../lib/audit.js";
import { disableWritesInDemo } from "../middleware/disableWritesInDemo.js";

const createOfferSchema = z.object({
  listingId: z.string().min(1),
  amount: z.number().positive(),
  message: z.string().max(2000).optional(),
});

const transitionSchema = z.object({
  amount: z.number().positive().optional(),
  message: z.string().max(2000).optional(),
});

const terminalStatuses = new Set<OfferStatus>(["accepted", "rejected", "expired"]);

const toDto = (offer: OfferDocument) => ({
  id: offer._id.toHexString(),
  listingId: offer.listingId.toHexString(),
  buyerId: offer.buyerId.toHexString(),
  sellerId: offer.sellerId.toHexString(),
  originalAmount: offer.originalAmount,
  currentAmount: offer.currentAmount,
  message: offer.message,
  status: offer.status,
  history: offer.history.map((item) => ({
    type: item.type,
    amount: item.amount,
    by: item.by.toHexString(),
    createdAt: item.createdAt,
  })),
  createdAt: offer.createdAt,
  updatedAt: offer.updatedAt,
});

const canCreateOffer = (role: string | null) => role === "buyer" || role === "enterprise" || role === "admin";

export default async function offersRoutes(app: FastifyInstance) {
  app.post(
    "/",
    { preHandler: [app.authenticate, disableWritesInDemo] },
    async (request, reply) => {
      if (!canCreateOffer(request.user.role)) {
        return fail(request, reply, "FORBIDDEN", "Buyer access required.", 403);
      }

      const payload = createOfferSchema.parse(request.body);
      if (!ObjectId.isValid(payload.listingId) || !ObjectId.isValid(request.user.id)) {
        return fail(request, reply, "BAD_REQUEST", "Invalid object id.", 400);
      }

      const listing = await getListingsCollection().findById(payload.listingId);
      if (!listing) {
        return fail(request, reply, "NOT_FOUND", "Listing not found.", 404);
      }

      const source = String(listing.source ?? "");
      if (!source.startsWith("seller:")) {
        return fail(request, reply, "BAD_REQUEST", "Listing is not linked to a seller.", 400);
      }
      const sellerIdRaw = source.replace("seller:", "");
      if (!ObjectId.isValid(sellerIdRaw)) {
        return fail(request, reply, "BAD_REQUEST", "Listing seller is invalid.", 400);
      }

      const now = new Date();
      const buyerId = new ObjectId(request.user.id);
      const sellerId = new ObjectId(sellerIdRaw);
      const history: OfferHistoryEntry[] = [
        { type: "created", amount: payload.amount, by: buyerId, createdAt: now },
      ];

      const offer: OfferDocument = {
        _id: new ObjectId(),
        listingId: new ObjectId(payload.listingId),
        buyerId,
        sellerId,
        originalAmount: payload.amount,
        currentAmount: payload.amount,
        message: payload.message,
        status: "pending",
        history,
        createdAt: now,
        updatedAt: now,
      };

      await getOffersCollection().insertOne(offer);

      audit("OFFER_CREATED", {
        offerId: offer._id.toHexString(),
        listingId: payload.listingId,
        buyerId: offer.buyerId.toHexString(),
        sellerId: offer.sellerId.toHexString(),
        amount: offer.currentAmount,
      });

      const seller = await getUsersCollection().findOne({ _id: sellerId });
      if (seller?.email) {
        await sendOfferStatusEmail({
          to: seller.email,
          listingId: payload.listingId,
          status: "pending",
          amount: offer.currentAmount,
          message: payload.message,
        });
      }

      return ok(request, toDto(offer));
    }
  );

  app.get("/", { preHandler: app.authenticate }, async (request, reply) => {
    if (!ObjectId.isValid(request.user.id)) {
      return fail(request, reply, "BAD_REQUEST", "Invalid user id.", 400);
    }

    const userId = new ObjectId(request.user.id);
    let offers: OfferDocument[] = [];

    if (request.user.role === "seller") {
      offers = await getOffersCollection().findMany({ sellerId: userId });
    } else if (request.user.role === "buyer" || request.user.role === "enterprise") {
      offers = await getOffersCollection().findMany({ buyerId: userId });
    } else if (request.user.role === "admin") {
      const buyerId = typeof (request.query as any)?.buyerId === "string" ? (request.query as any).buyerId : null;
      const sellerId = typeof (request.query as any)?.sellerId === "string" ? (request.query as any).sellerId : null;
      const query: { buyerId?: ObjectId; sellerId?: ObjectId } = {};
      if (buyerId && ObjectId.isValid(buyerId)) query.buyerId = new ObjectId(buyerId);
      if (sellerId && ObjectId.isValid(sellerId)) query.sellerId = new ObjectId(sellerId);
      offers = await getOffersCollection().findMany(query);
    } else {
      return fail(request, reply, "FORBIDDEN", "Forbidden.", 403);
    }

    return ok(request, offers.map(toDto));
  });

  app.post<{ Params: { id: string } }>(
    "/:id/counter",
    { preHandler: [app.authenticate, disableWritesInDemo] },
    async (request, reply) => {
      const payload = transitionSchema.parse(request.body);
      if (!payload.amount) {
        return fail(request, reply, "BAD_REQUEST", "Counter amount is required.", 400);
      }

      const offer = await getOffersCollection().findById(request.params.id);
      if (!offer) return fail(request, reply, "NOT_FOUND", "Offer not found.", 404);

      const actorId = request.user.id;
      const isBuyer = actorId === offer.buyerId.toHexString();
      const isSeller = actorId === offer.sellerId.toHexString();
      if (!isBuyer && !isSeller && request.user.role !== "admin") {
        return fail(request, reply, "FORBIDDEN", "Forbidden.", 403);
      }
      if (terminalStatuses.has(offer.status)) {
        return fail(request, reply, "INVALID_STATE", "Offer can no longer be changed.", 409);
      }

      const now = new Date();
      const by = ObjectId.isValid(actorId) ? new ObjectId(actorId) : offer.sellerId;
      const historyItem: OfferHistoryEntry = {
        type: "countered",
        amount: payload.amount,
        by,
        createdAt: now,
      };

      await getOffersCollection().updateOne(
        { _id: offer._id },
        {
          $set: {
            currentAmount: payload.amount,
            status: "countered",
            message: payload.message,
            updatedAt: now,
          },
          $push: { history: historyItem },
        }
      );

      audit("OFFER_COUNTERED", {
        offerId: offer._id.toHexString(),
        by: by.toHexString(),
        amount: payload.amount,
      });

      const recipientId = isBuyer ? offer.sellerId : offer.buyerId;
      const recipient = await getUsersCollection().findOne({ _id: recipientId });
      if (recipient?.email) {
        await sendOfferStatusEmail({
          to: recipient.email,
          listingId: offer.listingId.toHexString(),
          status: "countered",
          amount: payload.amount,
          message: payload.message,
        });
      }

      const updated = await getOffersCollection().findById(offer._id.toHexString());
      return ok(request, toDto(updated ?? offer));
    }
  );

  const mutateStatus = async (
    request: any,
    reply: any,
    nextStatus: Extract<OfferStatus, "accepted" | "rejected">,
    event: "OFFER_ACCEPTED" | "OFFER_REJECTED"
  ) => {
    const offer = await getOffersCollection().findById(request.params.id);
    if (!offer) return fail(request, reply, "NOT_FOUND", "Offer not found.", 404);

    const actorId = request.user.id;
    const isSeller = actorId === offer.sellerId.toHexString();
    const isBuyer = actorId === offer.buyerId.toHexString();

    if (nextStatus === "accepted" && !isSeller && request.user.role !== "admin") {
      return fail(request, reply, "FORBIDDEN", "Only seller can accept offers.", 403);
    }
    if (!isSeller && !isBuyer && request.user.role !== "admin") {
      return fail(request, reply, "FORBIDDEN", "Forbidden.", 403);
    }
    if (terminalStatuses.has(offer.status)) {
      return fail(request, reply, "INVALID_STATE", "Offer can no longer be changed.", 409);
    }

    const now = new Date();
    const by = ObjectId.isValid(actorId) ? new ObjectId(actorId) : offer.sellerId;
    const historyType: OfferHistoryType = nextStatus === "accepted" ? "accepted" : "rejected";

    await getOffersCollection().updateOne(
      { _id: offer._id },
      {
        $set: { status: nextStatus, updatedAt: now },
        $push: {
          history: {
            type: historyType,
            amount: offer.currentAmount,
            by,
            createdAt: now,
          },
        },
      }
    );

    audit(event, {
      offerId: offer._id.toHexString(),
      by: by.toHexString(),
      amount: offer.currentAmount,
    });

    const recipientId = isSeller ? offer.buyerId : offer.sellerId;
    const recipient = await getUsersCollection().findOne({ _id: recipientId });
    if (recipient?.email) {
      await sendOfferStatusEmail({
        to: recipient.email,
        listingId: offer.listingId.toHexString(),
        status: nextStatus,
        amount: offer.currentAmount,
      });
    }

    const updated = await getOffersCollection().findById(offer._id.toHexString());
    return ok(request, toDto(updated ?? offer));
  };

  app.post<{ Params: { id: string } }>(
    "/:id/accept",
    { preHandler: [app.authenticate, disableWritesInDemo] },
    async (request, reply) => mutateStatus(request, reply, "accepted", "OFFER_ACCEPTED")
  );

  app.post<{ Params: { id: string } }>(
    "/:id/reject",
    { preHandler: [app.authenticate, disableWritesInDemo] },
    async (request, reply) => mutateStatus(request, reply, "rejected", "OFFER_REJECTED")
  );
}
