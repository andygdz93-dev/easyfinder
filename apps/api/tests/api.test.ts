import { describe, it, expect, beforeAll, afterAll } from "vitest";
import supertest from "supertest";
import { buildServer } from "../src/server.js";

const app = buildServer();

beforeAll(async () => {
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

  it("returns the current user for /api/me with auth", async () => {
    const loginRes = await supertest(app.server)
      .post("/api/auth/login")
      .send({ email: "buyer@easyfinder.ai", password: "BuyerPass123!" });
    const token = loginRes.body.data.token;
    const res = await supertest(app.server)
      .get("/api/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe("buyer@easyfinder.ai");
    expect(res.body.data.role).toBe("buyer");
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

  it("demo cannot POST scoring configs", async () => {
    const res = await supertest(app.server)
      .post("/api/scoring-configs")
      .send({
        name: "Demo",
        weights: { hours: 0.3, price: 0.3, state: 0.4 },
        preferredStates: ["CA"],
        maxHours: 8000,
        maxPrice: 200000,
      });
    expect(res.status).toBe(401);
  });

  it("buyer can POST scoring configs", async () => {
    const loginRes = await supertest(app.server)
      .post("/api/auth/login")
      .send({ email: "buyer@easyfinder.ai", password: "BuyerPass123!" });
    const token = loginRes.body.data.token;
    const res = await supertest(app.server)
      .post("/api/scoring-configs")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Buyer Config",
        weights: { hours: 0.4, price: 0.4, state: 0.2 },
        preferredStates: ["TX"],
        maxHours: 9000,
        maxPrice: 220000,
      });
    expect(res.status).toBe(200);
  });


  it("supports watchlist add/remove endpoints", async () => {
    const addRes = await supertest(app.server).post("/api/watchlist/demo-1");
    expect(addRes.status).toBe(200);
    expect(addRes.body.data.item.listingId).toBe("demo-1");

    const listRes = await supertest(app.server).get("/api/watchlist");
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.data.items)).toBe(true);
    expect(listRes.body.data.items.some((item: any) => item.listingId === "demo-1")).toBe(true);

    const removeRes = await supertest(app.server).delete("/api/watchlist/demo-1");
    expect(removeRes.status).toBe(200);
    expect(removeRes.body.data.removed).toBe(true);
  });

  it("seller-only endpoint blocked for buyer", async () => {
    const loginRes = await supertest(app.server)
      .post("/api/auth/login")
      .send({ email: "buyer@easyfinder.ai", password: "BuyerPass123!" });
    const token = loginRes.body.data.token;
    const res = await supertest(app.server)
      .get("/api/seller/insights")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
