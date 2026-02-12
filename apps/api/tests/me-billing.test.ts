import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import supertest from "supertest";

const loginAndAcceptNda = async (app: FastifyInstance) => {
  const loginRes = await supertest(app.server)
    .post("/api/auth/login")
    .send({ email: "buyer@easyfinder.ai", password: "BuyerPass123!" });

  const token = loginRes.body?.data?.token as string;

  await supertest(app.server)
    .post("/api/nda/accept")
    .set("Authorization", `Bearer ${token}`)
    .send({ accepted: true });

  return token;
};

const buildServerWithEnv = async (
  overrides: Record<string, string | undefined>
): Promise<FastifyInstance> => {
  vi.resetModules();

  process.env.NODE_ENV = "test";
  process.env.VERCEL_PREVIEW_PATTERN = "1";
  process.env.EMAIL_ENABLED = "false";
  process.env.BILLING_ENABLED = "false";

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  const serverModule = await import("../src/server.js");
  const app = serverModule.buildServer();
  await app.ready();
  return app;
};

afterEach(() => {
  delete process.env.BILLING_STUB_PLAN;
});

describe("/api/me billing plan", () => {
  it("returns billing.plan from BILLING_STUB_PLAN when set", async () => {
    const app = await buildServerWithEnv({ BILLING_STUB_PLAN: "pro" });
    try {
      const token = await loginAndAcceptNda(app);
      const res = await supertest(app.server)
        .get("/api/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.billing.plan).toBe("pro");
    } finally {
      await app.close();
    }
  });

  it("returns billing.plan free when billing is disabled and no stub plan", async () => {
    const app = await buildServerWithEnv({ BILLING_STUB_PLAN: undefined, BILLING_ENABLED: "false" });
    try {
      const token = await loginAndAcceptNda(app);
      const res = await supertest(app.server)
        .get("/api/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.billing.plan).toBe("free");
    } finally {
      await app.close();
    }
  });
});
