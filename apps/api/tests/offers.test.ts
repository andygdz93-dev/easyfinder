import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import supertest from "supertest";
import { ObjectId } from "mongodb";
import { getListingsCollection } from "../src/listings.js";
import { __resetTestOffers } from "../src/offers.js";

let app: ReturnType<(typeof import("../src/server.js"))["buildServer"]>;
let getUsersCollection: (typeof import("../src/users.js"))["getUsersCollection"];
let buyerToken: string;
let sellerToken: string;

const seedListing = async (sellerObjectId: string) => {
  const listingId = new ObjectId().toHexString();
  await getListingsCollection().insertMany([
    {
      id: listingId,
      title: "Offer Listing",
      description: "Offer listing description",
      source: `seller:${sellerObjectId}`,
      price: 10000,
      currency: "USD",
      location: "Austin, TX",
      isPublished: true,
      status: "active",
      images: [],
    },
  ]);
  return listingId;
};

beforeAll(async () => {
  const serverModule = await import("../src/server.js");
  const usersModule = await import("../src/users.js");
  app = serverModule.buildServer();
  getUsersCollection = usersModule.getUsersCollection;
  await app.ready();

  const users = getUsersCollection();
  const buyer = await users.findOne({ emailLower: "buyer@easyfinder.ai" });
  const seller = await users.findOne({ emailLower: "seller@easyfinder.ai" });
  if (!buyer || !seller) throw new Error("Missing seeded users");

  buyerToken = app.jwt.sign({ id: buyer._id.toHexString(), email: buyer.email, role: "buyer" });
  sellerToken = app.jwt.sign({ id: seller._id.toHexString(), email: seller.email, role: "seller" });
});

beforeEach(() => {
  __resetTestOffers();
});

afterAll(async () => {
  await app.close();
});

describe("offers", () => {
  it("create offer", async () => {
    const users = getUsersCollection();
    const seller = await users.findOne({ emailLower: "seller@easyfinder.ai" });
    if (!seller) throw new Error("seller missing");
    const listingId = await seedListing(seller._id.toHexString());

    const res = await supertest(app.server)
      .post("/api/offers")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ listingId, amount: 9000, message: "Can you do 9k?" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("pending");
    expect(res.body.data.originalAmount).toBe(9000);
  });

  it("invalid transitions", async () => {
    const users = getUsersCollection();
    const seller = await users.findOne({ emailLower: "seller@easyfinder.ai" });
    if (!seller) throw new Error("seller missing");
    const listingId = await seedListing(seller._id.toHexString());

    const createRes = await supertest(app.server)
      .post("/api/offers")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ listingId, amount: 9000 });

    const offerId = createRes.body.data.id;

    const acceptRes = await supertest(app.server)
      .post(`/api/offers/${offerId}/accept`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({});
    expect(acceptRes.status).toBe(200);

    const counterAfterAccept = await supertest(app.server)
      .post(`/api/offers/${offerId}/counter`)
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ amount: 8800 });

    expect(counterAfterAccept.status).toBe(409);
    expect(counterAfterAccept.body.error.code).toBe("INVALID_STATE");
  });

  it("accept flow", async () => {
    const users = getUsersCollection();
    const seller = await users.findOne({ emailLower: "seller@easyfinder.ai" });
    if (!seller) throw new Error("seller missing");
    const listingId = await seedListing(seller._id.toHexString());

    const createRes = await supertest(app.server)
      .post("/api/offers")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ listingId, amount: 9100 });

    const offerId = createRes.body.data.id;
    const acceptRes = await supertest(app.server)
      .post(`/api/offers/${offerId}/accept`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({});

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.status).toBe("accepted");
  });

  it("reject flow", async () => {
    const users = getUsersCollection();
    const seller = await users.findOne({ emailLower: "seller@easyfinder.ai" });
    if (!seller) throw new Error("seller missing");
    const listingId = await seedListing(seller._id.toHexString());

    const createRes = await supertest(app.server)
      .post("/api/offers")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ listingId, amount: 9100 });

    const offerId = createRes.body.data.id;
    const rejectRes = await supertest(app.server)
      .post(`/api/offers/${offerId}/reject`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({});

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.status).toBe("rejected");
  });

  it("counter flow", async () => {
    const users = getUsersCollection();
    const seller = await users.findOne({ emailLower: "seller@easyfinder.ai" });
    if (!seller) throw new Error("seller missing");
    const listingId = await seedListing(seller._id.toHexString());

    const createRes = await supertest(app.server)
      .post("/api/offers")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ listingId, amount: 9100 });

    const offerId = createRes.body.data.id;
    const counterRes = await supertest(app.server)
      .post(`/api/offers/${offerId}/counter`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ amount: 9600, message: "Best we can do" });

    expect(counterRes.status).toBe(200);
    expect(counterRes.body.data.status).toBe("countered");
    expect(counterRes.body.data.currentAmount).toBe(9600);
  });
});
