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
});

afterAll(async () => {
  await app.close();
});

describe("API", () => {
  it("health returns 200", async () => {
    const res = await supertest(app.server).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("ok");
  });

  it("register/login returns token", async () => {
    const email = `test-${Date.now()}@easyfinder.ai`;
    const registerRes = await supertest(app.server)
      .post("/api/auth/register")
      .send({ email, password: "TestPass123!", name: "Tester" });
    expect(registerRes.status).toBe(200);
    expect(registerRes.body.data.token).toBeTruthy();
    expect(registerRes.body.data.user).toBeTruthy();

    const loginRes = await supertest(app.server)
      .post("/api/auth/login")
      .send({ email, password: "TestPass123!" });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.token).toBeTruthy();
    expect(loginRes.body.data.user).toBeTruthy();
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

  it("does not register billing routes when billing is disabled", async () => {
    const res = await supertest(app.server).post("/api/billing/webhook").send({ test: true });
    expect(res.status).toBe(404);
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

  it("seller-only endpoint blocked for buyer", async () => {
    const loginRes = await supertest(app.server)
      .post("/api/auth/login")
      .send({ email: "buyer@easyfinder.ai", password: "BuyerPass123!" });
    const token = loginRes.body.data.token;

    await acceptNda(token);

    const res = await supertest(app.server)
      .get("/api/seller/insights")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});
