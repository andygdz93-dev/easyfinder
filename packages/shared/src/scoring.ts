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

export const DefaultScoringConfig = defaultScoringConfig;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const inferYearFromTitle = (title?: string) => {
  if (!title) return undefined;
  const match = title.match(/\b(19|20)\d{2}\b/);
  if (!match) return undefined;
  const year = Number(match[0]);
  return Number.isFinite(year) ? year : undefined;
};

const stateSpeedBonus = (state: string | undefined, preferredStates: string[]) =>
  state && preferredStates.includes(state) ? 5 : 0;

const normalizeHours = (hours: number, config: ScoringConfig) => {
  if (!Number.isFinite(hours)) return 0.5;
  if (config.maxHours <= config.minHours) return 0.5;
  return clamp((hours - config.minHours) / (config.maxHours - config.minHours), 0, 1);
};

const normalizePrice = (price: number, config: ScoringConfig) => {
  if (!Number.isFinite(price)) return 0.5;
  if (config.maxPrice <= config.minPrice) return 0.5;
  return clamp((price - config.minPrice) / (config.maxPrice - config.minPrice), 0, 1);
};

type Reason = ScoreBreakdown["reasons"][number];
const reason = (kind: Reason["kind"], message: string): Reason => ({ kind, message });

const ageInDays = (iso?: string) => {
  if (!iso) return undefined;
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return undefined;
  return (Date.now() - parsed) / (1000 * 60 * 60 * 24);
};

export function scoreListing(listing: Listing, config: ScoringConfig): ScoreBreakdown {
  const operableFlag = listing.is_operable !== undefined ? listing.is_operable : listing.operable;
  const flags: string[] = [];
  if (operableFlag === false) {
    flags.push("NON_OPERABLE", "NOT_BEST_OPTION_ELIGIBLE");
    return {
      total: 0,
      breakdown: { deal: 0, usage: 0, risk: 0, speed: 0, quality: 0 },
      scoreV2: { deal: 0, usage: 0, risk: 0, speed: 0, quality: 0 },
      reasons: [reason("risk", "Listing marked as not operable.")],
      flags,
      confidence: 0,
      confidenceScore: 0,
      bestOptionEligible: false,
      disqualified: true,
    };
  }

  const price = Number.isFinite(listing.price) ? listing.price : Number.NaN;
  const hours = Number.isFinite(listing.hours) ? listing.hours : Number.NaN;
  const inferredYear = inferYearFromTitle(listing.title);
  const year = Number.isFinite(listing.year) ? listing.year : inferredYear ?? Number.NaN;

  // Deal score (price + hours interaction)
  const priceNorm = normalizePrice(price, config);
  const hoursNorm = normalizeHours(hours, config);
  const valuePressure = clamp(priceNorm * 0.65 + hoursNorm * 0.35 + priceNorm * hoursNorm * 0.5, 0, 1.5);
  let deal = clamp(Math.round((1 - valuePressure / 1.5) * 100), 0, 100);

  const dealReasons: Reason[] = [];
  if (deal >= 70) {
    dealReasons.push(reason("deal", "Strong value for hours (price low relative to usage)."));
  } else if (deal <= 40) {
    dealReasons.push(reason("deal", "Price is high for the listed hours."));
  } else {
    dealReasons.push(reason("deal", "Price and usage are reasonably balanced."));
  }
  if (!Number.isFinite(price)) {
    deal = clamp(deal - 18, 0, 100);
    dealReasons.push(reason("deal", "Price missing; value estimate is less reliable."));
  }
  if (!Number.isFinite(hours)) {
    deal = clamp(deal - 12, 0, 100);
    dealReasons.push(reason("deal", "Hours missing; value estimate is less reliable."));
  }

  // Usage score
  let usage = clamp(Math.round((1 - hoursNorm) * 100), 0, 100);
  const usageReasons: Reason[] = [];
  if (usage >= 70) {
    usageReasons.push(reason("usage", "Low hours for category."));
  } else if (usage <= 35) {
    usageReasons.push(reason("usage", "High hours (wear risk)."));
  } else {
    usageReasons.push(reason("usage", "Usage is moderate for this category."));
  }
  if (Number.isFinite(year)) {
    const yearNorm = clamp((year - config.minYear) / Math.max(1, config.maxYear - config.minYear), 0, 1);
    const yearBonus = Math.round((yearNorm - 0.5) * 16);
    usage = clamp(usage + yearBonus, 0, 100);
    usageReasons.push(reason("usage", yearBonus >= 0 ? "Newer model year slightly improves usage outlook." : "Older model year slightly reduces usage outlook."));
  }

  // Risk score
  let risk = 70;
  const riskReasons: Reason[] = [];
  if (listing.verifiedSeller) {
    risk += 8;
    riskReasons.push(reason("risk", "Verified seller lowers transaction risk."));
  }
  if (listing.hasInspectionReport) {
    risk += 10;
    riskReasons.push(reason("risk", "Inspection report available."));
  }
  if (listing.hasServiceHistory) {
    risk += 8;
    riskReasons.push(reason("risk", "Service history provided."));
  }

  const photos = Number.isFinite(listing.photoCount) ? listing.photoCount : listing.images?.length;
  if (!Number.isFinite(photos ?? Number.NaN)) {
    risk -= 10;
    riskReasons.push(reason("risk", "Photo count missing; visual verification risk is higher."));
  } else if ((photos ?? 0) < 5) {
    risk -= 10;
    riskReasons.push(reason("risk", "Low photo count increases inspection uncertainty."));
  }

  if (!Number.isFinite(price)) {
    risk -= 8;
    riskReasons.push(reason("risk", "Missing price increases negotiation uncertainty."));
  }
  if (!Number.isFinite(hours)) {
    risk -= 8;
    riskReasons.push(reason("risk", "Missing hours increases wear uncertainty."));
  }
  if (!listing.state) {
    risk -= 6;
    riskReasons.push(reason("risk", "Missing state increases logistics uncertainty."));
  }

  const staleDays = ageInDays(listing.lastSeenAt);
  if (typeof staleDays === "number" && staleDays > 14) {
    risk -= 8;
    flags.push("STALE_LISTING");
    riskReasons.push(reason("risk", "Listing appears stale; availability risk is higher."));
  }

  risk = clamp(Math.round(risk), 0, 100);

  // Speed score
  let speed = 50;
  const speedReasons: Reason[] = [];
  const sellerType = listing.sellerType ?? "unknown";
  const availability = listing.availability ?? "unknown";

  if (sellerType === "dealer") {
    speed += 20;
    speedReasons.push(reason("speed", "Dealer listing tends to close and deliver faster."));
  } else if (sellerType === "auction") {
    speed -= 12;
    speedReasons.push(reason("speed", "Auction listings often have slower acquisition cycles."));
  }

  if (availability === "in_stock") {
    speed += 12;
    speedReasons.push(reason("speed", "In-stock status improves acquisition speed."));
  } else if (availability === "scheduled_auction") {
    speed -= 10;
    speedReasons.push(reason("speed", "Scheduled auction timing can delay acquisition."));
  }

  if (listing.shippingAvailable) {
    speed += 10;
    speedReasons.push(reason("speed", "Shipping available supports faster delivery."));
  }

  const locationBonus = stateSpeedBonus(listing.state, config.preferredStates);
  if (locationBonus > 0) {
    speed += locationBonus;
    speedReasons.push(reason("speed", `Preferred state (${listing.state}) slightly improves logistics speed.`));
  }

  if (typeof staleDays === "number" && staleDays > 14) {
    speed -= 10;
    speedReasons.push(reason("speed", "Stale listing may indicate slower seller responsiveness."));
  }
  speed = clamp(Math.round(speed), 0, 100);

  // Quality and confidence
  let quality = 100;
  const qualityReasons: Reason[] = [];
  if (!Number.isFinite(price)) {
    quality -= 20;
    qualityReasons.push(reason("quality", "Missing price reduces data completeness."));
    flags.push("MISSING_PRICE");
  }
  if (!Number.isFinite(hours)) {
    quality -= 20;
    qualityReasons.push(reason("quality", "Missing hours reduces data completeness."));
    flags.push("MISSING_HOURS");
  }
  if (!listing.state) {
    quality -= 12;
    qualityReasons.push(reason("quality", "Missing state reduces logistics clarity."));
    flags.push("MISSING_STATE");
  }
  if (!listing.description?.trim()) {
    quality -= 8;
    qualityReasons.push(reason("quality", "Missing description lowers listing clarity."));
  }
  if (!Number.isFinite(photos ?? Number.NaN)) {
    quality -= 8;
    qualityReasons.push(reason("quality", "Photo count missing lowers verification confidence."));
  } else if ((photos ?? 0) < 5) {
    quality -= 8;
    qualityReasons.push(reason("quality", "Low photo count lowers verification confidence."));
  }
  quality = clamp(Math.round(quality), 0, 100);

  const total = clamp(Math.round(deal * 0.25 + usage * 0.25 + risk * 0.25 + speed * 0.25), 0, 100);
  const confidenceScore = clamp(Math.round(quality * 0.8 + risk * 0.2), 0, 100);

  const bestOptionEligible = !flags.includes("NON_OPERABLE") && confidenceScore >= 60 && risk >= 40;
  if (!bestOptionEligible) {
    flags.push("NOT_BEST_OPTION_ELIGIBLE");
  }

  const reasons = [...dealReasons.slice(0, 2), ...usageReasons.slice(0, 2), ...riskReasons.slice(0, 2), ...speedReasons.slice(0, 2), ...qualityReasons.slice(0, 2)].slice(0, 8);

  return {
    total,
    breakdown: { deal, usage, risk, speed, quality },
    scoreV2: { deal, usage, risk, speed, quality },
    reasons,
    flags,
    confidence: Number((confidenceScore / 100).toFixed(2)),
    confidenceScore,
    bestOptionEligible,
    disqualified: !bestOptionEligible,
  };
}
