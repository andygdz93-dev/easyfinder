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
  });

  it("rewards price, hours, year, and preferred location", () => {
    const better = scoreListing(
      { ...baseListing, hours: 1000, price: 30000, year: 2023, state: "CA", condition: 4.5 },
      defaultScoringConfig
    );
    const worse = scoreListing(
      { ...baseListing, hours: 9000, price: 220000, year: 2000, state: "NY", condition: 2 },
      defaultScoringConfig
    );

    expect(better.total ?? 0).toBeGreaterThan(worse.total ?? 0);
    expect(better.breakdown).toBeDefined();
    expect(worse.breakdown).toBeDefined();

    const betterB = better.breakdown!;
    const worseB = worse.breakdown!;

    const betterPrice = betterB.price ?? 0;
    const worsePrice = worseB.price ?? 0;
    const betterHours = betterB.hours ?? 0;
    const worseHours = worseB.hours ?? 0;
    const betterYear = betterB.year ?? 0;
    const worseYear = worseB.year ?? 0;
    const betterLocation = betterB.location ?? 0;
    const worseLocation = worseB.location ?? 0;

    expect(betterPrice).toBeGreaterThan(worsePrice);
    expect(betterHours).toBeGreaterThan(worseHours);
    expect(betterYear).toBeGreaterThan(worseYear);
    expect(betterLocation).toBeGreaterThan(worseLocation);
  });

  it("reduces confidence with missing data", () => {
    const score = scoreListing(
      { ...baseListing, price: Number.NaN, hours: Number.NaN, year: undefined, condition: undefined },
      defaultScoringConfig
    );
    expect(score.confidence).toBeLessThan(1);
    expect(score.breakdown).toBeDefined();

    const b = score.breakdown!;

    expect(b.completeness).toBeLessThan(100);
  });
});
