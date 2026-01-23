import { Listing, ScoreBreakdown, ScoringConfig } from "./types.js";

export const defaultScoringConfig: ScoringConfig = {
  id: "default",
  name: "Default",
  weights: {
    hours: 0.35,
    price: 0.35,
    state: 0.3,
  },
  preferredStates: ["CA", "AZ", "TX", "IA"],
  maxHours: 8000,
  maxPrice: 250000,
  active: true,
};

// ✅ Back-compat / dist export mismatch fix:
// Some builds or consumers expect `DefaultScoringConfig`.
// Export both names to avoid runtime ESM import errors.
export const DefaultScoringConfig = defaultScoringConfig;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export function scoreListing(
  listing: Listing,
  config: ScoringConfig
): ScoreBreakdown {
  if (!listing.operable) {
    return {
      total: 0,
      components: { operable: 0, hours: 0, price: 0, state: 0 },
      rationale: ["Listing marked as not operable."],
    };
  }

  // Make scoring resilient to missing values
  const hours = Number.isFinite(listing.hours) ? listing.hours : 0;
  const price = Number.isFinite(listing.price) ? listing.price : 0;

  // Avoid division by zero
  const maxHours = config.maxHours > 0 ? config.maxHours : 1;
  const maxPrice = config.maxPrice > 0 ? config.maxPrice : 1;

  const hoursScore = clamp(100 - (hours / maxHours) * 100, 0, 100);
  const priceScore = clamp(100 - (price / maxPrice) * 100, 0, 100);
  const stateScore = config.preferredStates.includes(listing.state) ? 100 : 50;

  const weighted =
    hoursScore * config.weights.hours +
    priceScore * config.weights.price +
    stateScore * config.weights.state;

  const total = clamp(Math.round(weighted), 0, 100);

  const rationale = [
    "Operable equipment prioritized.",
    `Hours score ${hoursScore.toFixed(0)} based on ${hours} hours.`,
    `Price score ${priceScore.toFixed(0)} based on $${price}.`,
    config.preferredStates.includes(listing.state)
      ? `Preferred state boost for ${listing.state}.`
      : `State ${listing.state} not in preferred list.`,
  ];

  return {
    total,
    components: {
      operable: 100,
      hours: Math.round(hoursScore),
      price: Math.round(priceScore),
      state: Math.round(stateScore),
    },
    rationale,
  };
}
