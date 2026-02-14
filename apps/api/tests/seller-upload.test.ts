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
      expect(res.body.error.code).toBe("FORBIDDEN");
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
