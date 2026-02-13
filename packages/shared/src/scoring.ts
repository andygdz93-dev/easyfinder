import type { Listing, ScoreBreakdown, ScoringConfig } from "./types.js";

export const defaultScoringConfig: ScoringConfig = {
  id: "default",
  name: "Default",
  weights: {
    price: 0.25,
    hours: 0.2,
    year: 0.2,
    location: 0.15,
    condition: 0.1,
    completeness: 0.1,
  },
  preferredStates: ["CA", "AZ", "TX", "IA"],
  minHours: 0,
  maxHours: 8000,
  minPrice: 0,
  maxPrice: 250000,
  minYear: 2000,
  maxYear: new Date().getFullYear() + 1,
  minCondition: 1,
  maxCondition: 5,
  active: true,
};

// Back-compat alias
export const DefaultScoringConfig = defaultScoringConfig;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const normalizeLowerIsBetter = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) return 50;
  if (max <= min) return 50;
  return clamp(((max - value) / (max - min)) * 100, 0, 100);
};

const normalizeHigherIsBetter = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) return 50;
  if (max <= min) return 50;
  return clamp(((value - min) / (max - min)) * 100, 0, 100);
};

const inferYearFromTitle = (title?: string) => {
  if (!title) return undefined;
  const match = title.match(/\b(19|20)\d{2}\b/);
  if (!match) return undefined;
  const year = Number(match[0]);
  if (!Number.isFinite(year)) return undefined;
  return year;
};

const normalizeWeights = (weights: ScoringConfig["weights"]) => {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, value]) => {
    const asNumber = typeof value === "number" && Number.isFinite(value) ? value : 0;
    return sum + asNumber;
  }, 0);
  if (total <= 0) {
    const equalWeight = 1 / entries.length;
    return Object.fromEntries(entries.map(([key]) => [key, equalWeight])) as ScoringConfig["weights"];
  }
  return Object.fromEntries(entries.map(([key, value]) => {
    const asNumber = typeof value === "number" && Number.isFinite(value) ? value : 0;
    return [key, asNumber / total];
  })) as ScoringConfig["weights"];
};

export function scoreListing(
  listing: Listing,
  config: ScoringConfig
): ScoreBreakdown {
  const operableFlag =
    listing.is_operable !== undefined ? listing.is_operable : listing.operable;
  if (operableFlag === false) {
    return {
      total: 0,
      breakdown: {
        price: 0,
        hours: 0,
        year: 0,
        location: 0,
        condition: 0,
        completeness: 0,
      },
      reasons: ["Listing marked as not operable."],
      confidence: 0,
      disqualified: true,
    };
  }

  const weights = normalizeWeights(config.weights);

  const hours = Number.isFinite(listing.hours) ? listing.hours : Number.NaN;
  const price = Number.isFinite(listing.price) ? listing.price : Number.NaN;
  const inferredYear = inferYearFromTitle(listing.title);
  const year = Number.isFinite(listing.year) ? listing.year : inferredYear ?? Number.NaN;
  const condition = Number.isFinite(listing.condition) ? listing.condition : Number.NaN;

  const hoursScore = normalizeLowerIsBetter(hours, config.minHours, config.maxHours);
  const priceScore = normalizeLowerIsBetter(price, config.minPrice, config.maxPrice);
  const yearScore = normalizeHigherIsBetter(year, config.minYear, config.maxYear);
  const locationScore = listing.state
    ? config.preferredStates.includes(listing.state)
      ? 100
      : 0
    : 0;
  const conditionScore = normalizeHigherIsBetter(
    condition,
    config.minCondition,
    config.maxCondition
  );

  const completenessFields = [
    { name: "price", value: price },
    { name: "hours", value: hours },
    { name: "year", value: Number.isFinite(listing.year) ? listing.year : Number.NaN, inferred: inferredYear },
    { name: "state", value: listing.state ? 1 : Number.NaN },
    { name: "condition", value: condition },
  ];

  const completenessScore = clamp(
    (completenessFields.reduce((sum, field) => {
      if (Number.isFinite(field.value)) return sum + 1;
      if (field.inferred) return sum + 0.5;
      return sum;
    }, 0) /
      completenessFields.length) *
      100,
    0,
    100
  );

  const weighted =
    priceScore * weights.price +
    hoursScore * weights.hours +
    yearScore * weights.year +
    locationScore * weights.location +
    conditionScore * weights.condition +
    completenessScore * weights.completeness;

  const total = clamp(Math.round(weighted), 0, 100);

  const reasons = [
    `Price score ${priceScore.toFixed(0)} based on $${Number.isFinite(price) ? price : "—"}.`,
    `Hours score ${hoursScore.toFixed(0)} based on ${Number.isFinite(hours) ? hours : "—"} hours.`,
    `Year score ${yearScore.toFixed(0)} based on ${Number.isFinite(year) ? year : "—"}.`,
    listing.state
      ? config.preferredStates.includes(listing.state)
        ? `Preferred state bonus for ${listing.state}.`
        : `No location bonus for ${listing.state}.`
      : "Location missing; no state bonus applied.",
    Number.isFinite(condition)
      ? `Condition score ${conditionScore.toFixed(0)} based on rating ${condition}.`
      : "Condition rating missing; neutral condition score applied.",
  ];

  if (!Number.isFinite(price)) reasons.push("Price data missing; confidence reduced.");
  if (!Number.isFinite(hours)) reasons.push("Hours data missing; confidence reduced.");
  if (!Number.isFinite(listing.year ?? Number.NaN)) {
    reasons.push(
      inferredYear
        ? `Model year inferred from title (${inferredYear}); confidence reduced.`
        : "Model year missing; confidence reduced."
    );
  }
  if (!listing.state) reasons.push("State missing; confidence reduced.");
  if (!Number.isFinite(condition)) reasons.push("Condition rating missing; confidence reduced.");

  return {
    total,
    breakdown: {
      price: Math.round(priceScore),
      hours: Math.round(hoursScore),
      year: Math.round(yearScore),
      location: Math.round(locationScore),
      condition: Math.round(conditionScore),
      completeness: Math.round(completenessScore),
    },
    reasons,
    confidence: Number((completenessScore / 100).toFixed(2)),
    disqualified: false,
  };
}
