import { describe, it, expect } from "vitest";
import { scoreListing, defaultScoringConfig, Listing } from "@easyfinderai/shared";

const baseListing = {
  id: "l1",
  title: "Test Loader",
  description: "Test",
  state: "CA",
  price: 100000,
  hours: 2000,
  operable: true,
  category: "Loader",
  images: [
    "/demo-images/other/1.jpg",
    "/demo-images/other/2.jpg",
    "/demo-images/other/3.jpg",
    "/demo-images/other/4.jpg",
    "/demo-images/other/5.jpg",
  ],
  imageUrl: "/demo-images/other/1.jpg",
  source: "mock",
  createdAt: new Date().toISOString(),
} satisfies Listing;

describe("scoring engine", () => {
  it("requires operable", () => {
    const score = scoreListing({ ...baseListing, operable: false }, defaultScoringConfig);
    expect(score.total).toBe(0);
    expect(score.disqualified).toBe(true);
    expect(score.bestOptionEligible).toBe(false);
  });

  it("lets cheap-higher-hours outrank expensive-low-hours only when value is very strong", () => {
    const expensiveLowHours = scoreListing(
      { ...baseListing, hours: 1200, price: 130000, year: 2020 },
      defaultScoringConfig
    );

    const moderatelyCheapHigherHours = scoreListing(
      { ...baseListing, hours: 3200, price: 60000, year: 2020 },
      defaultScoringConfig
    );

    const stronglyCheapHigherHours = scoreListing(
      { ...baseListing, hours: 3200, price: 25000, year: 2020, sellerType: "dealer", shippingAvailable: true, availability: "in_stock" },
      defaultScoringConfig
    );

    expect(moderatelyCheapHigherHours.total ?? 0).toBeLessThanOrEqual(expensiveLowHours.total ?? 0);
    expect(stronglyCheapHigherHours.breakdown?.deal ?? 0).toBeGreaterThan(expensiveLowHours.breakdown?.deal ?? 0);
    expect(stronglyCheapHigherHours.total ?? 0).toBeGreaterThan(expensiveLowHours.total ?? 0);
  });

  it("prioritizes speed for dealer + shipping", () => {
    const faster = scoreListing(
      {
        ...baseListing,
        sellerType: "dealer",
        shippingAvailable: true,
        availability: "in_stock",
      },
      defaultScoringConfig
    );
    const slower = scoreListing(
      {
        ...baseListing,
        sellerType: "auction",
        shippingAvailable: false,
        availability: "scheduled_auction",
      },
      defaultScoringConfig
    );

    expect(faster.breakdown?.speed ?? 0).toBeGreaterThan(slower.breakdown?.speed ?? 0);
    expect(faster.total ?? 0).toBeGreaterThan(slower.total ?? 0);
    expect((faster.reasons ?? []).some((entry) => entry.kind === "speed")).toBe(true);
    expect((slower.reasons ?? []).some((entry) => entry.kind === "speed")).toBe(true);
  });

  it("reduces confidence with missing data", () => {
    const score = scoreListing(
      { ...baseListing, price: Number.NaN, hours: Number.NaN },
      defaultScoringConfig
    );

    expect(score.confidenceScore).toBeLessThan(60);
    expect(score.flags).toContain("MISSING_PRICE");
    expect(score.flags).toContain("MISSING_HOURS");
    expect(score.bestOptionEligible).toBe(false);
  });
});
