import { afterAll, beforeAll, describe, expect, it } from "vitest";
import supertest from "supertest";

let app: ReturnType<(typeof import("../src/server.js"))["buildServer"]>;
let buyerToken = "";

beforeAll(async () => {
  process.env.ADMIN_EMAIL_ALLOWLIST = "admin@easyfinder.ai";
  const serverModule = await import("../src/server.js");
  const usersModule = await import("../src/users.js");
  app = serverModule.buildServer();
  await app.ready();

  const users = usersModule.getUsersCollection();
  const admin = await users.findOne({ emailLower: "admin@easyfinder.ai" });
  const buyer = await users.findOne({ emailLower: "buyer@easyfinder.ai" });
  if (!admin || !buyer) throw new Error("Missing users");

  buyerToken = app.jwt.sign({ id: buyer._id.toHexString(), email: buyer.email, role: "buyer", name: buyer.name });
});

afterAll(async () => {
  await app.close();
});

describe("admin auth", () => {
  it("401 with no token", async () => {
    const res = await supertest(app.server).get("/api/admin/overview");
    expect(res.status).toBe(401);
  });

  it("403 for non-admin", async () => {
    const res = await supertest(app.server).get("/api/admin/overview").set("Authorization", `Bearer ${buyerToken}`);
    expect(res.status).toBe(403);
  });

  it("403 for admin email not allowlisted", async () => {
    const unallowlistedAdminToken = app.jwt.sign({ id: "admin-test", email: "notallowed@easyfinder.ai", role: "admin", name: "Admin" });
    const res = await supertest(app.server).get("/api/admin/overview").set("Authorization", `Bearer ${unallowlistedAdminToken}`);
    expect(res.status).toBe(403);
  });
});
