import { afterAll, beforeAll, describe, expect, it } from "vitest";
import supertest from "supertest";
import { getListingsCollection } from "../src/listings.js";
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

  it("delete requires confirm and writes audit", async () => {
    const missingConfirm = await supertest(app.server)
      .delete(`/api/admin/listings/${listingId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "nope" });
    expect(missingConfirm.status).toBe(400);

    const before = getTestAuditLogs().length;
    const res = await supertest(app.server)
      .delete(`/api/admin/listings/${listingId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ confirm: true, reason: "test-delete" });

    expect(res.status).toBe(200);
    expect(getTestAuditLogs().length).toBeGreaterThan(before);
  });
});
