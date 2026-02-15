import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import supertest from "supertest";

const buildServer = async (): Promise<FastifyInstance> => {
  vi.resetModules();

  process.env.NODE_ENV = "test";
  process.env.VERCEL_PREVIEW_PATTERN = "1";
  process.env.EMAIL_ENABLED = "false";
  process.env.BILLING_ENABLED = "false";

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
  await supertest(app.server)
    .post("/api/nda/accept")
    .set("Authorization", `Bearer ${token}`)
    .send({ accepted: true });
};

const activatePromo = async (app: FastifyInstance, token: string) => {
  await supertest(app.server)
    .post("/api/billing/activate-pro-promo")
    .set("Authorization", `Bearer ${token}`)
    .send({});
};

const buildRow = (index: number) => ({
  title: `Excavator ${index}`,
  make: "Caterpillar",
  model: "320",
  year: "2020",
  hours: "1800",
  price: "178000",
  condition: "good",
  state: "CA",
  description: "Well maintained",
  image1: "",
  image2: "",
  image3: "",
  image4: "",
  image5: "",
});

afterEach(() => {
  delete process.env.BILLING_STUB_PLAN;
});

describe("/api/seller/upload", () => {
  it("uploads valid rows for pro sellers", async () => {
    const app = await buildServer();
    try {
      const token = await login(app, "seller@easyfinder.ai", "SellerPass123!");
      await activatePromo(app, token);
      await acceptNda(app, token);

      const res = await supertest(app.server)
        .post("/api/seller/upload")
        .set("Authorization", `Bearer ${token}`)
        .send({ rows: [buildRow(1), buildRow(2)] });

      expect(res.status).toBe(200);
      expect(res.body.data.created).toBe(2);
      expect(res.body.data.failed).toBe(0);
    } finally {
      await app.close();
    }
  });

  it("rejects free seller uploads", async () => {
    const app = await buildServer();
    try {
      const token = await login(app, "seller@easyfinder.ai", "SellerPass123!");
      await acceptNda(app, token);

      const res = await supertest(app.server)
        .post("/api/seller/upload")
        .set("Authorization", `Bearer ${token}`)
        .send({ rows: [buildRow(1)] });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("upgrade_required");
    } finally {
      await app.close();
    }
  });


  it("publishes uploaded listings so buyers can discover them", async () => {
    const app = await buildServer();
    try {
      const sellerToken = await login(app, "seller@easyfinder.ai", "SellerPass123!");
      await activatePromo(app, sellerToken);
      await acceptNda(app, sellerToken);

      const uploadRes = await supertest(app.server)
        .post("/api/seller/upload")
        .set("Authorization", `Bearer ${sellerToken}`)
        .send({
          rows: [
            {
              ...buildRow(1),
              title: "2019 CAT 320 Excavator",
            },
          ],
        });

      expect(uploadRes.status).toBe(200);
      expect(uploadRes.body.data.created).toBe(1);
      expect(Array.isArray(uploadRes.body.data.createdIds)).toBe(true);
      expect(uploadRes.body.data.createdIds.length).toBe(1);
      expect(Array.isArray(uploadRes.body.data.liveListingIds)).toBe(true);
      expect(uploadRes.body.data.liveListingIds).toEqual(uploadRes.body.data.createdIds);

      const sellerListingsRes = await supertest(app.server)
        .get("/api/seller/listings")
        .set("Authorization", `Bearer ${sellerToken}`);

      expect(sellerListingsRes.status).toBe(200);
      expect(Array.isArray(sellerListingsRes.body.data)).toBe(true);
      expect(sellerListingsRes.body.data[0]?.status).toBe("active");

      const buyerToken = await login(app, "buyer@easyfinder.ai", "BuyerPass123!");
      await acceptNda(app, buyerToken);

      const buyerListingsRes = await supertest(app.server)
        .get("/api/listings")
        .set("Authorization", `Bearer ${buyerToken}`);

      expect(buyerListingsRes.status).toBe(200);
      expect(buyerListingsRes.headers["cache-control"]).toBe("no-store");
      expect(Array.isArray(buyerListingsRes.body.data)).toBe(true);
      expect(
        buyerListingsRes.body.data.some(
          (listing: { title?: string; status?: string }) =>
            listing.title === "2019 CAT 320 Excavator" && listing.status === "active"
        )
      ).toBe(true);

      const listingId = uploadRes.body.data.createdIds[0] as string;
      const buyerListingDetailRes = await supertest(app.server)
        .get(`/api/listings/${listingId}`)
        .set("Authorization", `Bearer ${buyerToken}`);

      expect(buyerListingDetailRes.status).toBe(200);
      expect(buyerListingDetailRes.headers["cache-control"]).toBe("no-store");
      expect(buyerListingDetailRes.body.data.id).toBe(listingId);
      expect(buyerListingDetailRes.body.data.status).toBe("active");
    } finally {
      await app.close();
    }
  });

  it("enforces pro listing cap at 200", async () => {
    const app = await buildServer();
    try {
      const token = await login(app, "seller@easyfinder.ai", "SellerPass123!");
      await activatePromo(app, token);
      await acceptNda(app, token);

      const rows = Array.from({ length: 201 }, (_, i) => buildRow(i + 1));
      const res = await supertest(app.server)
        .post("/api/seller/upload")
        .set("Authorization", `Bearer ${token}`)
        .send({ rows });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("SELLER_CAP_EXCEEDED");
    } finally {
      await app.close();
    }
  });
});
