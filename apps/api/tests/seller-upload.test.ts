import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import supertest from "supertest";

let mockImageIdCounter = 1;

vi.mock("../src/gridfs-images.js", () => ({
  uploadImageToGridFs: vi.fn(async () => ({
    toHexString: () => String(mockImageIdCounter++).padStart(24, "0"),
  })),
  getImageFileFromGridFs: vi.fn(async () => null),
  openImageDownloadStreamFromGridFs: vi.fn(() => {
    throw new Error("not implemented in tests");
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

const activatePromo = async (app: FastifyInstance, token: string) => {
  const promoRes = await supertest(app.server)
    .post("/api/billing/activate-pro-promo")
    .set("Authorization", `Bearer ${token}`)
    .send({});

  expect(promoRes.status).toBe(200);

  await supertest(app.server)
    .post("/api/nda/accept")
    .set("Authorization", `Bearer ${token}`)
    .send({ accepted: true });

  const meRes = await supertest(app.server)
    .get("/api/me")
    .set("Authorization", `Bearer ${token}`);

  expect(meRes.status).toBe(200);
  expect(meRes.body.data.billing.plan).toBe("pro");
  expect(meRes.body.data.billing.isPromo).toBe(true);
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
  location: "Los Angeles, CA",
  description: "Well maintained",
  image1: "",
  image2: "",
  image3: "",
  image4: "",
  image5: "",
});

const buildRowWithImages = (index: number) => ({
  ...buildRow(index),
  location: `Austin, TX ${index}`,
  imageUrl: "https://cdn.example.com/logo.svg",
  imageUrl2: "https://cdn.example.com/equipment-hero.jpg",
  imageUrl3: "https://cdn.example.com/equipment-hero.jpg",
  imageUrl4: "https://cdn.example.com/favicon.png",
  imageUrl5: "https://cdn.example.com/equipment-angle.jpg",
});


const buildCsvFromRows = (rows: Array<Record<string, string>>) => {
  const headers = Array.from(rows.reduce((set, row) => {
    Object.keys(row).forEach((key) => set.add(key));
    return set;
  }, new Set<string>()));

  const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => quote(String(row[header] ?? ""))).join(","));
  }

  return `${lines.join("\n")}\n`;
};

const createStoredZip = (files: Array<{ name: string; data: Buffer }>) => {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const fileNameBuffer = Buffer.from(file.name, "utf8");
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(0, 14);
    localHeader.writeUInt32LE(file.data.length, 18);
    localHeader.writeUInt32LE(file.data.length, 22);
    localHeader.writeUInt16LE(fileNameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, fileNameBuffer, file.data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(0, 16);
    centralHeader.writeUInt32LE(file.data.length, 20);
    centralHeader.writeUInt32LE(file.data.length, 24);
    centralHeader.writeUInt16LE(fileNameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, fileNameBuffer);

    offset += localHeader.length + fileNameBuffer.length + file.data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const endOfCentralDirectory = Buffer.alloc(22);
  endOfCentralDirectory.writeUInt32LE(0x06054b50, 0);
  endOfCentralDirectory.writeUInt16LE(0, 4);
  endOfCentralDirectory.writeUInt16LE(0, 6);
  endOfCentralDirectory.writeUInt16LE(files.length, 8);
  endOfCentralDirectory.writeUInt16LE(files.length, 10);
  endOfCentralDirectory.writeUInt32LE(centralDirectory.length, 12);
  endOfCentralDirectory.writeUInt32LE(offset, 16);
  endOfCentralDirectory.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, endOfCentralDirectory]);
};

afterEach(() => {
  delete process.env.BILLING_STUB_PLAN;
  mockImageIdCounter = 1;
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

  it("returns missingColumns details when required CSV columns are absent", async () => {
    const app = await buildServer();
    try {
      const token = await login(app, "seller@easyfinder.ai", "SellerPass123!");
      await activatePromo(app, token);
      await acceptNda(app, token);

      const withoutLocation = { ...buildRow(1) } as Record<string, unknown>;
      delete withoutLocation.location;

      const res = await supertest(app.server)
        .post("/api/seller/upload")
        .set("Authorization", `Bearer ${token}`)
        .send({ rows: [withoutLocation] });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.details.missingColumns).toContain("location");
    } finally {
      await app.close();
    }
  });

  it("returns row+field validation errors for invalid contact email and numeric fields", async () => {
    const app = await buildServer();
    try {
      const token = await login(app, "seller@easyfinder.ai", "SellerPass123!");
      await activatePromo(app, token);
      await acceptNda(app, token);

      const res = await supertest(app.server)
        .post("/api/seller/upload")
        .set("Authorization", `Bearer ${token}`)
        .send({
          rows: [
            {
              ...buildRow(1),
              location: "Dallas, TX",
              contactEmail: "not-an-email",
            },
            {
              ...buildRow(2),
              location: "Houston, TX",
              price: "12.34.99",
            },
            {
              ...buildRow(3),
              location: "San Antonio, TX",
              year: "2020.5",
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.created).toBe(0);
      expect(res.body.data.failed).toBe(3);
      expect(res.body.data.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ row: 2, field: "contactEmail", code: "INVALID_EMAIL" }),
          expect.objectContaining({ row: 3, field: "price", code: "INVALID_NUMBER" }),
          expect.objectContaining({ row: 4, field: "year", code: "INVALID_INTEGER" }),
        ])
      );
    } finally {
      await app.close();
    }
  });

  it("filters junk image URLs, dedupes, and applies placeholder when no valid images remain", async () => {
    const app = await buildServer();
    try {
      const token = await login(app, "seller@easyfinder.ai", "SellerPass123!");
      await activatePromo(app, token);
      await acceptNda(app, token);

      const res = await supertest(app.server)
        .post("/api/seller/upload")
        .set("Authorization", `Bearer ${token}`)
        .send({
          rows: [
            buildRowWithImages(1),
            {
              ...buildRow(2),
              location: "Phoenix, AZ",
              imageUrl: "https://cdn.example.com/icon.svg",
              imageUrl2: "https://cdn.example.com/pixel.gif",
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.created).toBe(2);

      const listingsRes = await supertest(app.server)
        .get("/api/seller/listings")
        .set("Authorization", `Bearer ${token}`);

      expect(listingsRes.status).toBe(200);
      const first = listingsRes.body.data.find((item: { title: string }) => item.title === "Excavator 1");
      const second = listingsRes.body.data.find((item: { title: string }) => item.title === "Excavator 2");

      expect(first.imageUrl).toBe("https://cdn.example.com/equipment-hero.jpg");
      expect(first.images).toEqual([
        "https://cdn.example.com/equipment-hero.jpg",
        "https://cdn.example.com/equipment-angle.jpg",
        "https://cdn.example.com/equipment-hero.jpg",
        "https://cdn.example.com/equipment-hero.jpg",
        "https://cdn.example.com/equipment-hero.jpg",
      ]);

      expect(second.imageUrl).toBe("/demo-images/other/1.jpg");
      expect(second.images).toEqual(Array(5).fill("/demo-images/other/1.jpg"));
    } finally {
      await app.close();
    }
  });
  it("supports multipart CSV upload with URL image values unchanged", async () => {
    const app = await buildServer();
    try {
      const token = await login(app, "seller@easyfinder.ai", "SellerPass123!");
      await activatePromo(app, token);
      await acceptNda(app, token);

      const csv = buildCsvFromRows([
        {
          title: "Multipart URL Listing",
          description: "CSV multipart still supports URL images",
          location: "Denver, CO",
          imageUrl: "https://cdn.example.com/multipart-a.jpg",
          imageUrl2: "https://cdn.example.com/multipart-b.jpg",
        },
      ]);

      const uploadRes = await supertest(app.server)
        .post("/api/seller/upload")
        .set("Authorization", `Bearer ${token}`)
        .attach("csv", Buffer.from(csv, "utf8"), "seller.csv");

      expect(uploadRes.status).toBe(200);
      expect(uploadRes.body.data.created).toBe(1);

      const listingsRes = await supertest(app.server)
        .get("/api/seller/listings")
        .set("Authorization", `Bearer ${token}`);

      expect(listingsRes.status).toBe(200);
      const listing = listingsRes.body.data.find((item: { title: string }) => item.title === "Multipart URL Listing");
      expect(listing.imageUrl).toBe("https://cdn.example.com/multipart-a.jpg");
      expect(listing.images[1]).toBe("https://cdn.example.com/multipart-b.jpg");
    } finally {
      await app.close();
    }
  });

  it("maps zipped image filenames to row number and image slots", async () => {
    const app = await buildServer();
    try {
      const token = await login(app, "seller@easyfinder.ai", "SellerPass123!");
      await activatePromo(app, token);
      await acceptNda(app, token);

      const csv = buildCsvFromRows([
        {
          title: "Zip Mapped Listing",
          description: "Map zip files by row/slot",
          location: "Boise, ID",
          imageUrl: "ignored-name.jpg",
          imageUrl2: "ignored-too.png",
        },
        {
          title: "No Zip Match Listing",
          description: "No images should still import",
          location: "Tampa, FL",
          imageUrl: "missing-file.jpg",
        },
      ]);

      const zip = createStoredZip([
        { name: "nested/2-A.PNG", data: Buffer.from("image-a") },
        { name: "2 b.webp", data: Buffer.from("image-b") },
        { name: "ignore/README.txt", data: Buffer.from("skip") },
      ]);

      const uploadRes = await supertest(app.server)
        .post("/api/seller/upload")
        .set("Authorization", `Bearer ${token}`)
        .attach("csv", Buffer.from(csv, "utf8"), "seller.csv")
        .attach("imagesZip", zip, "images.zip");

      expect(uploadRes.status).toBe(200);
      expect(uploadRes.body.data.created).toBe(2);

      const listingsRes = await supertest(app.server)
        .get("/api/seller/listings")
        .set("Authorization", `Bearer ${token}`);

      expect(listingsRes.status).toBe(200);
      const mapped = listingsRes.body.data.find((item: { title: string }) => item.title === "Zip Mapped Listing");
      expect(mapped.imageUrl).toMatch(/^\/api\/images\/[a-f0-9]{24}$/);
      expect(mapped.images[1]).toMatch(/^\/api\/images\/[a-f0-9]{24}$/);

      const noMatch = listingsRes.body.data.find((item: { title: string }) => item.title === "No Zip Match Listing");
      expect(noMatch.imageUrl).toBe("/demo-images/other/1.jpg");
      expect(noMatch.images).toEqual(Array(5).fill("/demo-images/other/1.jpg"));
    } finally {
      await app.close();
    }
  });

  it("fails multipart upload when zip contains duplicate normalized row-slot keys", async () => {
    const app = await buildServer();
    try {
      const token = await login(app, "seller@easyfinder.ai", "SellerPass123!");
      await activatePromo(app, token);
      await acceptNda(app, token);

      const csv = buildCsvFromRows([
        {
          title: "Duplicate Zip Listing",
          description: "duplicate key should fail",
          location: "Nashville, TN",
          imageUrl: "filename.jpg",
        },
      ]);

      const zip = createStoredZip([
        { name: "2A.jpg", data: Buffer.from("first") },
        { name: "2-A.PNG", data: Buffer.from("second") },
      ]);

      const uploadRes = await supertest(app.server)
        .post("/api/seller/upload")
        .set("Authorization", `Bearer ${token}`)
        .attach("csv", Buffer.from(csv, "utf8"), "seller.csv")
        .attach("imagesZip", zip, "images.zip");

      expect(uploadRes.status).toBe(400);
      expect(uploadRes.body.error.code).toBe("BAD_REQUEST");
      expect(uploadRes.body.error.message).toContain("Duplicate image mapping found in ZIP");
    } finally {
      await app.close();
    }
  });

});
