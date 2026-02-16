import { ObjectId } from "mongodb";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import supertest from "supertest";
import { getListingsCollection } from "../src/listings.js";
import { getInquiriesCollection } from "../src/inquiries.js";
import { getTestAuditLogs } from "../src/audit.js";

let app: ReturnType<(typeof import("../src/server.js"))["buildServer"]>;
let adminToken = "";
const listingId = `admin-listing-${Date.now()}`;

beforeAll(async () => {
  process.env.ADMIN_EMAIL_ALLOWLIST = "admin@easyfinder.ai";
  const serverModule = await import("../src/server.js");
  const usersModule = await import("../src/users.js");
  app = serverModule.buildServer();
  await app.ready();

  const admin = await usersModule.getUsersCollection().findOne({ emailLower: "admin@easyfinder.ai" });
  if (!admin) throw new Error("Missing admin");

  adminToken = app.jwt.sign({ id: admin._id.toHexString(), email: admin.email, role: "admin", name: admin.name });

  await getInquiriesCollection().insertOne({
    _id: new ObjectId(),
    listingId,
    sellerId: "seller:test",
    buyerId: "buyer:test",
    buyerEmail: "buyer@example.com",
    buyerName: "Buyer Test",
    message: "Is this still available?",
    status: "new",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await getListingsCollection().insertMany([
    {
      id: listingId,
      title: "Admin test listing",
      description: "for moderation",
      state: "TX",
      price: 1000,
      hours: 100,
      operable: true,
      category: "Excavator",
      source: "seller:test",
      images: [],
      imageUrl: "",
      createdAt: new Date().toISOString(),
      status: "active",
    },
  ]);
});

afterAll(async () => {
  await app.close();
});

describe("admin listings", () => {
  it("patch status updates and writes audit", async () => {
    const before = getTestAuditLogs().length;
    const res = await supertest(app.server)
      .patch(`/api/admin/listings/${listingId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "paused", reason: "test-pause" });

    expect(res.status).toBe(200);
    expect(res.body.data.listing.status).toBe("paused");
    expect(getTestAuditLogs().length).toBeGreaterThan(before);
  });


  it("returns listing details with linked inquiries and audit events", async () => {
    await supertest(app.server)
      .patch(`/api/admin/listings/${listingId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "active", reason: "detail-view" });

    const res = await supertest(app.server)
      .get(`/api/admin/listings/${listingId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.listing.id).toBe(listingId);
    expect(Array.isArray(res.body.data.inquiries)).toBe(true);
    expect(res.body.data.inquiries[0].listingId).toBe(listingId);
    expect(Array.isArray(res.body.data.audit)).toBe(true);
    expect(res.body.data.audit.some((item: { targetId: string }) => item.targetId === listingId)).toBe(true);
  });
  it("hard delete requires typed confirmation phrase and reason, then writes audit", async () => {
    const missingConfirm = await supertest(app.server)
      .delete(`/api/admin/listings/${listingId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ confirmation: `DELETE wrong-${listingId}`, reason: "nope" });
    expect(missingConfirm.status).toBe(400);

    const before = getTestAuditLogs().length;
    const res = await supertest(app.server)
      .delete(`/api/admin/listings/${listingId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ confirmation: `DELETE ${listingId}`, reason: "test-delete" });

    expect(res.status).toBe(200);
    expect(getTestAuditLogs().length).toBeGreaterThan(before);
  });
});
