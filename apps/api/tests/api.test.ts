import { describe, it, expect, beforeAll, afterAll } from "vitest";
import supertest from "supertest";

process.env.VERCEL_PREVIEW_PATTERN = process.env.VERCEL_PREVIEW_PATTERN ?? "1";
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "sk_test_123";
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_test";
process.env.STRIPE_PRICE_ID_PRO = process.env.STRIPE_PRICE_ID_PRO ?? "price_pro";
process.env.STRIPE_PRICE_ID_ENTERPRISE =
  process.env.STRIPE_PRICE_ID_ENTERPRISE ?? "price_enterprise";

let app: ReturnType<(typeof import("../src/server.js"))["buildServer"]>;
let getUsersCollection: (typeof import("../src/users.js"))["getUsersCollection"];
let buyerToken: string;
let sellerToken: string;

const acceptNda = async (token: string) => {
  const res = await supertest(app.server)
    .post("/api/nda/accept")
    .set("Authorization", `Bearer ${token}`)
    .send({ accepted: true });
  expect(res.status).toBe(200);
  expect(res.body.data.accepted).toBe(true);
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
  if (!buyer || !seller) {
    throw new Error("Missing seeded test users.");
  }

  buyerToken = app.jwt.sign({
    id: buyer._id.toHexString(),
    email: buyer.email,
    role: "buyer",
    name: buyer.name,
  });

  sellerToken = app.jwt.sign({
    id: seller._id.toHexString(),
    email: seller.email,
    role: "seller",
    name: seller.name,
  });
});

afterAll(async () => {
  await app.close();
});

describe("API", () => {
  it("health returns 200", async () => {
    const res = await supertest(app.server).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.data.ok).toBe(true);
    expect(typeof res.body.data.demoMode).toBe("boolean");
    expect(typeof res.body.data.billingEnabled).toBe("boolean");
  });

  it("register/login returns token", async () => {
    const email = `test-${Date.now()}@easyfinder.ai`;
    const registerRes = await supertest(app.server)
      .post("/api/auth/register")
      .send({ email, password: "TestPass123!", name: "Tester" });
    expect(registerRes.status).toBe(200);
    expect(registerRes.body.data.token).toBeTruthy();
    expect(registerRes.body.data.user).toBeTruthy();
    expect(registerRes.body.data.user.role).toBeNull();

    const loginRes = await supertest(app.server)
      .post("/api/auth/login")
      .send({ email, password: "TestPass123!" });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.token).toBeTruthy();
    expect(loginRes.body.data.user).toBeTruthy();
  });

  it("does not rate limit auth and nda routes in non-production", async () => {
    const email = `ratelimit-${Date.now()}@easyfinder.ai`;
    const registerRes = await supertest(app.server)
      .post("/api/auth/register")
      .send({ email, password: "TestPass123!", name: "Rate Limit" });

    expect(registerRes.status).toBe(200);

    const loginStatuses: number[] = [];
    let token = "";

    for (let i = 0; i < 25; i += 1) {
      const loginRes = await supertest(app.server)
        .post("/api/auth/login")
        .send({ email, password: "TestPass123!" });

      loginStatuses.push(loginRes.status);
      if (i === 0) {
        token = loginRes.body.data.token;
      }
    }

    expect(loginStatuses.every((status) => status !== 429)).toBe(true);

    const ndaStatuses: number[] = [];
    for (let i = 0; i < 25; i += 1) {
      const ndaRes = await supertest(app.server)
        .post("/api/nda/accept")
        .set("Authorization", `Bearer ${token}`)
        .send({ accepted: true });
      ndaStatuses.push(ndaRes.status);
    }

    expect(ndaStatuses.every((status) => status !== 429)).toBe(true);
  });


  it("requires auth for /api/me", async () => {
    const res = await supertest(app.server).get("/api/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("requires NDA for /api/me until accepted", async () => {
    const loginRes = await supertest(app.server)
      .post("/api/auth/login")
      .send({ email: "buyer@easyfinder.ai", password: "BuyerPass123!" });
    const token = loginRes.body.data.token;

    const blockedRes = await supertest(app.server)
      .get("/api/me")
      .set("Authorization", `Bearer ${token}`);
    expect(blockedRes.status).toBe(403);
    expect(blockedRes.body.error.code).toBe("NDA_REQUIRED");

    await acceptNda(token);

    const allowedRes = await supertest(app.server)
      .get("/api/me")
      .set("Authorization", `Bearer ${token}`);
    expect(allowedRes.status).toBe(200);
    expect(allowedRes.body.data.email).toBe("buyer@easyfinder.ai");
    expect(allowedRes.body.data.role).toBe("buyer");
  });

  it("returns nda status with accepted boolean", async () => {
    const loginRes = await supertest(app.server)
      .post("/api/auth/login")
      .send({ email: "buyer@easyfinder.ai", password: "BuyerPass123!" });
    const token = loginRes.body.data.token;
    const res = await supertest(app.server)
      .get("/api/nda/status")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.data.accepted).toBe("boolean");
  });

  it("allows CORS preflight from vercel preview origins", async () => {
    const origin = "https://web-abc123-easyfinder.vercel.app";
    const res = await supertest(app.server)
      .options("/api/auth/register")
      .set("Origin", origin)
      .set("Access-Control-Request-Method", "POST");
    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe(origin);
  });

  it("handles CORS preflight for auth login", async () => {
    const origin = "https://easyfinder.vercel.app";
    const res = await supertest(app.server)
      .options("/api/auth/login")
      .set("Origin", origin)
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "Authorization, Content-Type");
    expect([200, 204]).toContain(res.status);
    expect(res.headers["access-control-allow-origin"]).toBe(origin);
    expect(res.headers["access-control-allow-methods"]).toContain("POST");
    expect(res.headers["access-control-allow-headers"]).toContain("Authorization");
    expect(res.headers["access-control-allow-headers"]).toContain("Content-Type");
  });

  it("handles CORS preflight for nda status", async () => {
    const origin = "https://easyfinder.vercel.app";
    const res = await supertest(app.server)
      .options("/api/nda/status")
      .set("Origin", origin)
      .set("Access-Control-Request-Method", "GET")
      .set("Access-Control-Request-Headers", "Authorization, Content-Type");
    expect([200, 204]).toContain(res.status);
    expect(res.headers["access-control-allow-origin"]).toBe(origin);
  });

  it("returns CORS headers for auth login POST", async () => {
    const origin = "https://easyfinder.vercel.app";
    const res = await supertest(app.server)
      .post("/api/auth/login")
      .set("Origin", origin)
      .send({ email: "buyer@easyfinder.ai", password: "BuyerPass123!" });
    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe(origin);
    expect(res.body.data.token).toBeTruthy();
  });

  it("returns 503 for Stripe webhook when billing is disabled", async () => {
    const res = await supertest(app.server).post("/api/billing/webhook").send({ test: true });
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe("billing_disabled");
  });

  it("demo cannot POST scoring configs", async () => {
    const res = await supertest(app.server)
      .post("/api/scoring-configs")
      .send({
        name: "Demo",
        weights: {
          price: 0.25,
          hours: 0.2,
          year: 0.2,
          location: 0.15,
          condition: 0.1,
          completeness: 0.1,
        },
        preferredStates: ["CA"],
        minHours: 0,
        maxHours: 8000,
        minPrice: 0,
        maxPrice: 200000,
        minYear: 2000,
        maxYear: 2025,
        minCondition: 1,
        maxCondition: 5,
      });
    expect(res.status).toBe(401);
  });

  it("buyer can POST scoring configs", async () => {
    const loginRes = await supertest(app.server)
      .post("/api/auth/login")
      .send({ email: "buyer@easyfinder.ai", password: "BuyerPass123!" });
    const token = loginRes.body.data.token;
    const col = getUsersCollection();
    await col.updateOne(
      { emailLower: "buyer@easyfinder.ai" },
      {
        $set: {
          billing: {
            plan: "pro",
            status: "active",
            current_period_end: new Date(Date.now() + 86400000),
          },
        },
      }
    );
    await acceptNda(token);
    const res = await supertest(app.server)
      .post("/api/scoring-configs")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Buyer Config",
        weights: {
          price: 0.3,
          hours: 0.25,
          year: 0.15,
          location: 0.15,
          condition: 0.1,
          completeness: 0.05,
        },
        preferredStates: ["TX"],
        minHours: 0,
        maxHours: 9000,
        minPrice: 0,
        maxPrice: 220000,
        minYear: 2000,
        maxYear: 2025,
        minCondition: 1,
        maxCondition: 5,
      });
    expect(res.status).toBe(200);
  });


  it("supports watchlist add/remove endpoints", async () => {
    const loginRes = await supertest(app.server)
      .post("/api/auth/login")
      .send({ email: "buyer@easyfinder.ai", password: "BuyerPass123!" });
    const token = loginRes.body.data.token;
    const col = getUsersCollection();
    await col.updateOne(
      { emailLower: "buyer@easyfinder.ai" },
      {
        $set: {
          billing: {
            plan: "pro",
            status: "active",
            current_period_end: new Date(Date.now() + 86400000),
          },
        },
      }
    );

    await acceptNda(token);

    const addRes = await supertest(app.server)
      .post("/api/watchlist/demo-1")
      .set("Authorization", `Bearer ${token}`);
    expect(addRes.status).toBe(200);
    expect(addRes.body.data.item.listingId).toBe("demo-1");

    const listRes = await supertest(app.server)
      .get("/api/watchlist")
      .set("Authorization", `Bearer ${token}`);
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.data.items)).toBe(true);
    expect(listRes.body.data.items.some((item: any) => item.listingId === "demo-1")).toBe(true);

    const removeRes = await supertest(app.server)
      .delete("/api/watchlist/demo-1")
      .set("Authorization", `Bearer ${token}`);
    expect(removeRes.status).toBe(200);
    expect(removeRes.body.data.removed).toBe(true);
  });


  it("buyer can create inquiry with listingId and message", async () => {
    const createRes = await supertest(app.server)
      .post("/api/inquiries")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ listingId: "demo-request-info-1", message: "Interested" });

    expect(createRes.status).toBe(200);
    expect(createRes.body.data.status).toBe("new");
    expect(createRes.body.data.listingId).toBe("demo-request-info-1");
  });

  it("creating the same inquiry twice returns 409 and INQUIRY_EXISTS", async () => {
    const payload = { listingId: "demo-request-info-duplicate", message: "Need details" };

    const firstRes = await supertest(app.server)
      .post("/api/inquiries")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send(payload);

    expect(firstRes.status).toBe(200);

    const secondRes = await supertest(app.server)
      .post("/api/inquiries")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send(payload);

    expect(secondRes.status).toBe(409);
    expect(secondRes.body.error.code).toBe("INQUIRY_EXISTS");
  });

  it("seller cannot POST /api/inquiries", async () => {
    const createRes = await supertest(app.server)
      .post("/api/inquiries")
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ listingId: "demo-request-info-forbidden", message: "Interested" });

    expect(createRes.status).toBe(403);
    expect(createRes.body.error.code).toBe("FORBIDDEN");
  });

  it("seller can list inquiries", async () => {
    const createRes = await supertest(app.server)
      .post("/api/inquiries")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ listingId: "demo-request-info-seller-list", message: "Interested" });

    expect(createRes.status).toBe(200);

    const listRes = await supertest(app.server)
      .get("/api/seller/inquiries")
      .set("Authorization", `Bearer ${sellerToken}`);

    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);
    expect(listRes.body.data.some((inquiry: any) => inquiry.listingId === "demo-request-info-seller-list")).toBe(true);
  });

  it("sets role via /api/me/role and persists to backend", async () => {
    const email = `role-${Date.now()}@easyfinder.ai`;
    const registerRes = await supertest(app.server)
      .post("/api/auth/register")
      .send({ email, password: "RolePass123!", name: "Role User" });

    expect(registerRes.status).toBe(200);
    expect(registerRes.body.data.user.role).toBeNull();

    const token = registerRes.body.data.token;
    const updateRes = await supertest(app.server)
      .patch("/api/me/role")
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "seller" });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.role).toBe("seller");

    const loginRes = await supertest(app.server)
      .post("/api/auth/login")
      .send({ email, password: "RolePass123!" });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.user.role).toBe("seller");
  });

  it("rejects enterprise role when user is not enterprise entitled", async () => {
    const loginRes = await supertest(app.server)
      .post("/api/auth/login")
      .send({ email: "buyer@easyfinder.ai", password: "BuyerPass123!" });

    const token = loginRes.body.data.token;
    const col = getUsersCollection();
    await col.updateOne(
      { emailLower: "buyer@easyfinder.ai" },
      {
        $set: {
          billing: {
            plan: "pro",
            status: "active",
            current_period_end: new Date(Date.now() + 86400000),
          },
        },
      }
    );

    const res = await supertest(app.server)
      .patch("/api/me/role")
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "enterprise" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("ROLE_NOT_ALLOWED");
  });

  it("allows enterprise role when enterprise entitlement is active", async () => {
    const token = sellerToken;
    const col = getUsersCollection();
    await col.updateOne(
      { emailLower: "seller@easyfinder.ai" },
      {
        $set: {
          billing: {
            plan: "enterprise",
            status: "active",
            current_period_end: new Date(Date.now() + 86400000),
          },
        },
      }
    );

    const res = await supertest(app.server)
      .patch("/api/me/role")
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "enterprise" });

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe("enterprise");
  });

  it("seller-only endpoint blocked for buyer", async () => {
    const token = buyerToken;

    await acceptNda(token);

    const res = await supertest(app.server)
      .get("/api/seller/insights")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});
