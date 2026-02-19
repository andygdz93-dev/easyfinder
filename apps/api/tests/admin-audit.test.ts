import { afterAll, beforeAll, describe, expect, it } from "vitest";
import supertest from "supertest";
import { insertAuditEvent } from "../src/audit.js";

let app: ReturnType<(typeof import("../src/server.js"))["buildServer"]>;
let adminToken = "";

beforeAll(async () => {
  process.env.ADMIN_EMAIL_ALLOWLIST = "admin@easyfinder.ai";
  const serverModule = await import("../src/server.js");
  const usersModule = await import("../src/users.js");
  app = serverModule.buildServer();
  await app.ready();

  const admin = await usersModule.getUsersCollection().findOne({ emailLower: "admin@easyfinder.ai" });
  if (!admin) throw new Error("Missing admin");

  adminToken = app.jwt.sign({ id: admin._id.toHexString(), email: admin.email, role: "admin", name: admin.name });

  await insertAuditEvent({
    actorUserId: admin._id.toHexString(),
    actorEmail: admin.email,
    action: "TEST_ACTION",
    targetType: "listing",
    targetId: "listing-123",
    reason: "for-test",
    before: { status: "active" },
    after: { status: "paused" },
    requestId: "req-test",
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
  });
});

afterAll(async () => {
  await app.close();
});

describe("admin audit", () => {
  it("lists audit logs with filters", async () => {
    const res = await supertest(app.server)
      .get("/api/admin/audit")
      .query({ event: "TEST_ACTION", resource: "listing-123", page: 1, pageSize: 10 })
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBeGreaterThan(0);
    expect(res.body.data.items[0].event).toBe("TEST_ACTION");
    expect(res.body.data.items[0].timestamp).toBeTypeOf("string");
  });
});
