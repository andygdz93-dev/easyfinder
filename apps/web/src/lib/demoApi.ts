// apps/web/src/lib/demoApi.ts

import { Listing, ScoreBreakdown } from "@easyfinderai/shared";
import { apiFetch } from "./api";

export type DemoListing = Listing & {
  totalScore?: number;
  scoreBreakdown?: ScoreBreakdown["components"];
  rationale?: string[];
  confidenceScore?: number;
  flags?: string[];
  score?: ScoreBreakdown;
};

export type DemoListingsResponse = {
  total: number;
  listings: DemoListing[];
};

export type DemoListingFilters = {
  state?: string;
  maxHours?: number;
  maxPrice?: number;
};

export const getDemoListings = (filters: DemoListingFilters) => {
  const params = new URLSearchParams();
  if (filters.state) params.set("state", filters.state);
  if (filters.maxHours) params.set("maxHours", String(filters.maxHours));
  if (filters.maxPrice) params.set("maxPrice", String(filters.maxPrice));
  const query = params.toString();

  // ✅ Uses Fly API base via apiFetch()
  return apiFetch<DemoListingsResponse>(`/listings${query ? `?${query}` : ""}`);
};

export const getDemoListing = (id: string) =>
  apiFetch<DemoListing>(`/listings/${id}`);
