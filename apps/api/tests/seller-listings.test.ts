import type { FastifyInstance } from "fastify";
import { describe, expect, it, vi } from "vitest";
import supertest from "supertest";

const buildServer = async (): Promise<FastifyInstance> => {
  vi.resetModules();

  process.env.NODE_ENV = "test";
  process.env.VERCEL_PREVIEW_PATTERN = "1";
  process.env.EMAIL_ENABLED = "false";
  process.env.BILLING_ENABLED = "false";
  process.env.ALLOW_DEMO_WRITES_IN_TESTS = "true";
  process.env.BILLING_STUB_PLAN = "pro";

  const serverModule = await import("../src/server.js");
  const app = serverModule.buildServer();
  await app.ready();
  return app;
};

const login = async (app: FastifyInstance, email: string, password: string) => {
  const loginRes = await supertest(app.server).post("/api/auth/login").send({ email, password });
  return loginRes.body?.data?.token as string;
};

const acceptNda = async (app: FastifyInstance, token: string) => {
  await supertest(app.server).post("/api/nda/accept").set("Authorization", `Bearer ${token}`).send({ accepted: true });
};

const activatePromo = async (app: FastifyInstance, token: string) => {
  const promoRes = await supertest(app.server)
    .post("/api/billing/activate-pro-promo")
    .set("Authorization", `Bearer ${token}`)
    .send({});

  expect(promoRes.status).toBe(200);
};

describe("/api/seller/listings manual create", () => {
  it("creates a listing with one image and pads to 5 images", async () => {
    const app = await buildServer();
    try {
      const token = await login(app, "seller@easyfinder.ai", "SellerPass123!");
      await activatePromo(app, token);
      await acceptNda(app, token);

      const res = await supertest(app.server)
        .post("/api/seller/listings")
        .set("Authorization", `Bearer ${token}`)
        .timeout(15000)
        .send({
          title: "Manual listing",
          description: "Manual description",
          location: "Dallas, TX",
          images: ["https://example.com/hero.jpg"],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.id).toContain("seller:");
      expect(res.body.data.images).toHaveLength(5);
      expect(res.body.data.images[0]).toBe("https://example.com/hero.jpg");
      expect(res.body.data.images[4]).toBe("https://example.com/hero.jpg");
      expect(res.body.data.imageUrl).toBe("https://example.com/hero.jpg");
    } finally {
      await app.close();
    }
  });

  it("creates a listing with placeholder images when none are provided", async () => {
    const app = await buildServer();
    try {
      const token = await login(app, "seller@easyfinder.ai", "SellerPass123!");
      await activatePromo(app, token);
      await acceptNda(app, token);

      const res = await supertest(app.server)
        .post("/api/seller/listings")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "No image listing",
          description: "No image description",
          location: "Denver, CO",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.images).toEqual(Array(5).fill("http://localhost:8080/demo-images/other/1.jpg"));
      expect(res.body.data.imageUrl).toBe("http://localhost:8080/demo-images/other/1.jpg");
    } finally {
      await app.close();
    }
  });

  it("returns validation errors when required fields are missing", async () => {
    const app = await buildServer();
    try {
      const token = await login(app, "seller@easyfinder.ai", "SellerPass123!");
      await activatePromo(app, token);
      await acceptNda(app, token);

      const res = await supertest(app.server)
        .post("/api/seller/listings")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "",
          description: "",
          location: "",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(Array.isArray(res.body.error.details)).toBe(true);
      expect(res.body.error.details.some((detail: { path: string }) => detail.path === "title")).toBe(true);
      expect(res.body.error.details.some((detail: { path: string }) => detail.path === "description")).toBe(true);
      expect(res.body.error.details.some((detail: { path: string }) => detail.path === "location")).toBe(true);
    } finally {
      await app.close();
    }
  });
});


describe("/api/seller/listings patch", () => {
  it("seller can PATCH their own listing to add images later", async () => {
    const app = await buildServer();
    try {
      const token = await login(app, "seller@easyfinder.ai", "SellerPass123!");
      await activatePromo(app, token);
      await acceptNda(app, token);

      const createRes = await supertest(app.server)
        .post("/api/seller/listings")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Patch target",
          description: "No images yet",
          location: "Phoenix, AZ",
        });

      const listingId = createRes.body.data.id as string;
      const patchRes = await supertest(app.server)
        .patch(`/api/seller/listings/${listingId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ images: ["/api/uploads/images/507f1f77bcf86cd799439011"] });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.images[0]).toBe("http://localhost:8080/api/uploads/images/507f1f77bcf86cd799439011");
      expect(patchRes.body.data.imageUrl).toBe("http://localhost:8080/api/uploads/images/507f1f77bcf86cd799439011");
    } finally {
      await app.close();
    }
  });

  it("seller cannot PATCH another seller listing", async () => {
    const app = await buildServer();
    try {
      const sellerOneToken = await login(app, "seller@easyfinder.ai", "SellerPass123!");
      await activatePromo(app, sellerOneToken);
      await acceptNda(app, sellerOneToken);

      const secondEmail = `seller2+${Date.now()}@easyfinder.ai`;
      const registerRes = await supertest(app.server).post("/api/auth/register").send({
        email: secondEmail,
        password: "SellerPass123!",
        name: "Seller Two",
        role: "seller",
      });
      const sellerTwoToken = registerRes.body?.data?.token as string;
      await acceptNda(app, sellerTwoToken);

      const createRes = await supertest(app.server)
        .post("/api/seller/listings")
        .set("Authorization", `Bearer ${sellerOneToken}`)
        .send({
          title: "Seller one listing",
          description: "Owned by seller one",
          location: "Austin, TX",
        });

      const listingId = createRes.body.data.id as string;
      const patchRes = await supertest(app.server)
        .patch(`/api/seller/listings/${listingId}`)
        .set("Authorization", `Bearer ${sellerTwoToken}`)
        .send({ title: "Hacked title" });

      expect(patchRes.status).toBe(403);
    } finally {
      await app.close();
    }
  });

  it("admin can PATCH any seller listing", async () => {
    const app = await buildServer();
    try {
      const sellerToken = await login(app, "seller@easyfinder.ai", "SellerPass123!");
      await activatePromo(app, sellerToken);
      await acceptNda(app, sellerToken);

      const adminToken = await login(app, "admin@easyfinder.ai", "AdminPass123!");
      await acceptNda(app, adminToken);

      const createRes = await supertest(app.server)
        .post("/api/seller/listings")
        .set("Authorization", `Bearer ${sellerToken}`)
        .send({
          title: "Admin editable",
          description: "Owned by seller",
          location: "Boise, ID",
        });

      const listingId = createRes.body.data.id as string;
      const patchRes = await supertest(app.server)
        .patch(`/api/seller/listings/${listingId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ title: "Admin updated title" });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.title).toBe("Admin updated title");
    } finally {
      await app.close();
    }
  });
});
