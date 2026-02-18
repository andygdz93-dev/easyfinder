import type { FastifyInstance } from "fastify";
import { Readable } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
import supertest from "supertest";

const mockStorage = new Map<string, { buffer: Buffer; contentType: string }>();

vi.mock("../src/gridfs-images.js", () => ({
  uploadImageToGridFs: vi.fn(async ({ buffer, contentType }: { buffer: Buffer; contentType: string }) => {
    const id = `507f1f77bcf86cd7994390${String(mockStorage.size + 10).padStart(2, "0")}`;
    mockStorage.set(id, { buffer, contentType });
    return {
      toHexString: () => id,
    };
  }),
  getImageFileFromGridFs: vi.fn(async (id: { toHexString: () => string }) => {
    const key = id.toHexString();
    const file = mockStorage.get(key);
    if (!file) return null;
    return {
      contentType: file.contentType,
      metadata: { contentType: file.contentType },
    };
  }),
  openImageDownloadStreamFromGridFs: vi.fn((id: { toHexString: () => string }) => {
    const file = mockStorage.get(id.toHexString());
    return Readable.from(file ? [file.buffer] : []);
  }),
}));

const buildServer = async (): Promise<FastifyInstance> => {
  vi.resetModules();

  process.env.NODE_ENV = "test";
  process.env.VERCEL_PREVIEW_PATTERN = "1";
  process.env.EMAIL_ENABLED = "false";
  process.env.BILLING_ENABLED = "false";
  process.env.ALLOW_DEMO_WRITES_IN_TESTS = "true";

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

afterEach(() => {
  mockStorage.clear();
});

describe("seller image uploads", () => {
  it("returns stable URLs and serves uploaded files", async () => {
    const app = await buildServer();

    try {
      const token = await login(app, "seller@easyfinder.ai", "SellerPass123!");
      await acceptNda(app, token);

      const uploadRes = await supertest(app.server)
        .post("/api/seller/images")
        .set("Authorization", `Bearer ${token}`)
        .attach("images", Buffer.from("fake-image"), {
          filename: "machine.png",
          contentType: "image/png",
        });

      expect(uploadRes.status).toBe(200);
      expect(uploadRes.body.data.images).toHaveLength(1);
      expect(uploadRes.body.data.images[0]).toMatch(/^\/api\/images\/[a-f0-9]{24}$/i);

      const imageUrl = uploadRes.body.data.images[0] as string;
      const getRes = await supertest(app.server).get(imageUrl);

      expect(getRes.status).toBe(200);
      expect(getRes.headers["content-type"]).toContain("image/png");
    } finally {
      await app.close();
    }
  });
});
