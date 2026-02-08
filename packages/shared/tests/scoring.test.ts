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
  source: "auctionplanet",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("scoreListing", () => {
  it("returns zero when listing is not operable", () => {
    const result = scoreListing(
      { ...baseListing, operable: false },
      defaultScoringConfig
    );

    expect(result.total).toBe(0);
    expect(result.disqualified).toBe(true);
    expect(result.breakdown.price).toBe(0);
    expect(result.reasons[0]).toMatch(/not operable/i);
  });

  it("flags missing data and reduces confidence", () => {
    const result = scoreListing(
      {
        ...baseListing,
        price: Number.NaN,
        hours: Number.NaN,
        year: undefined,
        condition: undefined,
      },
      defaultScoringConfig
    );

    expect(result.confidence).toBeLessThan(1);
    expect(result.breakdown.completeness).toBeLessThan(100);
    expect(result.reasons.join(" ")).toMatch(/missing/i);
  });

  it("handles extreme values", () => {
    const result = scoreListing(
      {
        ...baseListing,
        price: 9999999,
        hours: 50000,
        year: 1990,
        condition: 1,
      },
      defaultScoringConfig
    );

    expect(result.breakdown.price).toBe(0);
    expect(result.breakdown.hours).toBe(0);
    expect(result.breakdown.year).toBe(0);
  });

  it("scores a perfect listing highly", () => {
    const result = scoreListing(
      {
        ...baseListing,
        price: 50000,
        hours: 500,
        year: defaultScoringConfig.maxYear,
        condition: defaultScoringConfig.maxCondition,
        state: "CA",
      },
      defaultScoringConfig
    );

    expect(result.total).toBeGreaterThanOrEqual(90);
    expect(result.confidence).toBe(1);
  });
});
