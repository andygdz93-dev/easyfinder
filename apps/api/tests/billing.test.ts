import { describe, it, expect, beforeAll, afterAll } from "vitest";
import supertest from "supertest";
import Stripe from "stripe";

process.env.VERCEL_PREVIEW_PATTERN = process.env.VERCEL_PREVIEW_PATTERN ?? "1";
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "sk_test_123";
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_test";
process.env.STRIPE_PRICE_ID_PRO = process.env.STRIPE_PRICE_ID_PRO ?? "price_pro";
process.env.STRIPE_PRICE_ID_ENTERPRISE =
  process.env.STRIPE_PRICE_ID_ENTERPRISE ?? "price_enterprise";

if (process.env.BILLING_ENABLED === "true") {
  describe("billing", () => {
    let app: ReturnType<(typeof import("../src/server.js"))["buildServer"]>;
    let getUsersCollection: (typeof import("../src/users.js"))["getUsersCollection"];

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

    describe("Billing enforcement", () => {
      it("requires active subscription", async () => {
        const loginRes = await supertest(app.server)
          .post("/api/auth/login")
          .send({ email: "buyer@easyfinder.ai", password: "BuyerPass123!" });
        const token = loginRes.body.data.token;

        const res = await supertest(app.server)
          .get("/api/watchlist")
          .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(402);
      });

      it("blocks expired subscriptions", async () => {
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
                current_period_end: new Date(Date.now() - 3600000),
              },
            },
          }
        );

        const res = await supertest(app.server)
          .get("/api/watchlist")
          .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(402);
      });
    });

    describe("Stripe webhooks", () => {
      it("rejects invalid signatures", async () => {
        const res = await supertest(app.server)
          .post("/api/billing/webhook")
          .set("stripe-signature", "invalid")
          .send({ test: true });
        expect(res.status).toBe(400);
      });

      it("updates billing from subscription events", async () => {
        const col = getUsersCollection();
        await col.updateOne(
          { emailLower: "buyer@easyfinder.ai" },
          {
            $set: {
              billing: {
                stripe_customer_id: "cus_test_123",
                plan: "free",
                status: "canceled",
                current_period_end: new Date(0),
              },
            },
          }
        );

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
          apiVersion: "2024-06-20",
        });

        const subscription = {
          id: "sub_test_123",
          object: "subscription",
          customer: "cus_test_123",
          status: "active",
          current_period_end: Math.floor(Date.now() / 1000) + 86400,
          items: {
            object: "list",
            data: [
              {
                id: "si_test",
                object: "subscription_item",
                price: {
                  id: process.env.STRIPE_PRICE_ID_PRO!,
                  object: "price",
                },
              },
            ],
          },
        };

        const event = {
          id: "evt_test_123",
          object: "event",
          type: "customer.subscription.updated",
          data: { object: subscription },
        };

        const payload = JSON.stringify(event);
        const signature = stripe.webhooks.generateTestHeaderString({
          payload,
          secret: process.env.STRIPE_WEBHOOK_SECRET!,
        });

        const res = await supertest(app.server)
          .post("/api/billing/webhook")
          .set("stripe-signature", signature)
          .set("Content-Type", "application/json")
          .send(payload);

        expect(res.status).toBe(200);

        const updated = await col.findOne({ emailLower: "buyer@easyfinder.ai" });
        expect(updated?.billing?.plan).toBe("pro");
        expect(updated?.billing?.status).toBe("active");
        expect(updated?.billing?.stripe_subscription_id).toBe("sub_test_123");
      });
    });
  });
}

else {
  describe.skip("billing", () => {
    it("skips billing tests when BILLING_ENABLED is false", () => {});
  });
}
