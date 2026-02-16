import { describe, expect, it } from "vitest";
import { defaultScoringConfig, scoreListing } from "../src/scoring.js";
import { Listing } from "../src/types.js";

const baseListing: Listing = {
  id: "listing-1",
  title: "2020 CA Excavator 1",
  description: "Well-maintained excavator ready for work.",
  state: "CA",
  price: 90000,
  hours: 1800,
  operable: true,
  year: 2020,
  condition: 4.5,
  category: "Excavator",
  imageUrl: "https://example.com/image.jpg",
  images: [
    "https://example.com/image-1.jpg",
    "https://example.com/image-2.jpg",
    "https://example.com/image-3.jpg",
    "https://example.com/image-4.jpg",
    "https://example.com/image-5.jpg"
  ],
  source: "auctionplanet",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("scoreListing", () => {
  it("returns zero and marks ineligible when listing is not operable", () => {
    const result = scoreListing({ ...baseListing, operable: false }, defaultScoringConfig);

    expect(result.total).toBe(0);
    expect(result.disqualified).toBe(true);
    expect(result.breakdown.risk).toBe(0);
    expect(result.flags).toContain("NON_OPERABLE");
    expect(result.bestOptionEligible).toBe(false);
  });

  it("applies speed advantage for dealer + shipping", () => {
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

    expect(faster.breakdown.speed).toBeGreaterThan(slower.breakdown.speed);
    expect(faster.total).toBeGreaterThan(slower.total);
    expect(faster.reasons.some((entry) => entry.kind === "speed")).toBe(true);
    expect(slower.reasons.some((entry) => entry.kind === "speed")).toBe(true);
  });

  it("lets cheap-higher-hours outrank expensive-low-hours only when value is very strong", () => {
    const expensiveLowHours = scoreListing(
      {
        ...baseListing,
        price: 130000,
        hours: 1200,
      },
      defaultScoringConfig
    );

    const moderatelyCheapHigherHours = scoreListing(
      {
        ...baseListing,
        price: 60000,
        hours: 3200,
      },
      defaultScoringConfig
    );

    const stronglyCheapHigherHours = scoreListing(
      {
        ...baseListing,
        price: 25000,
        hours: 3200,
        sellerType: "dealer",
        shippingAvailable: true,
        availability: "in_stock",
      },
      defaultScoringConfig
    );

    expect(moderatelyCheapHigherHours.total).toBeLessThanOrEqual(expensiveLowHours.total);
    expect(stronglyCheapHigherHours.breakdown.deal).toBeGreaterThan(expensiveLowHours.breakdown.deal);
    expect(stronglyCheapHigherHours.total).toBeGreaterThan(expensiveLowHours.total);
  });

  it("reduces confidence when price and hours are missing", () => {
    const result = scoreListing(
      {
        ...baseListing,
        price: Number.NaN,
        hours: Number.NaN,
      },
      defaultScoringConfig
    );

    expect(result.confidenceScore).toBeLessThan(60);
    expect(result.flags).toContain("MISSING_PRICE");
    expect(result.flags).toContain("MISSING_HOURS");
    expect(result.bestOptionEligible).toBe(false);
  });
});
