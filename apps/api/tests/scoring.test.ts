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
  imageUrl: "https://example.com/img.png",
  source: "mock",
  createdAt: new Date().toISOString(),
} satisfies Listing;

describe("scoring engine", () => {
  it("requires operable", () => {
    const score = scoreListing({ ...baseListing, operable: false }, defaultScoringConfig);
    expect(score.total).toBe(0);
  });

  it("hours and price influence score", () => {
    const lowHours = scoreListing({ ...baseListing, hours: 1000 }, defaultScoringConfig);
    const highHours = scoreListing({ ...baseListing, hours: 9000 }, defaultScoringConfig);
    expect(lowHours.total ?? 0).toBeGreaterThan(highHours.total ?? 0);

    const lowPrice = scoreListing({ ...baseListing, price: 30000 }, defaultScoringConfig);
    const highPrice = scoreListing({ ...baseListing, price: 220000 }, defaultScoringConfig);
    expect(lowPrice.total ?? 0).toBeGreaterThan(highPrice.total ?? 0);
  });

  it("preferred states boost", () => {
    const preferred = scoreListing({ ...baseListing, state: "CA" }, defaultScoringConfig);
    const nonPreferred = scoreListing({ ...baseListing, state: "NY" }, defaultScoringConfig);
    expect(preferred.total ?? 0).toBeGreaterThan(nonPreferred.total ?? 0);
  });
});
