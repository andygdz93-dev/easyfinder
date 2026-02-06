import {
  Listing,
  ScoreBreakdown,
  ScoringConfig,
  WatchlistItem,
} from "@easyfinderai/shared";
import { requireApiBaseUrl } from "../env";
import { getStoredAuthToken } from "./auth";

type ApiEnvelope<T> = {
  data?: T;
  error?: { code: string; message: string };
  requestId?: string;
};

export type ListingWithScore = Listing & {
  totalScore: number;
  scores: ScoreBreakdown["components"];
  rationale: string[];
};

export class ApiError extends Error {
  requestId?: string;

  constructor(message: string, requestId?: string) {
    super(message);
    this.name = "ApiError";
    this.requestId = requestId;
  }
}

/**
 * Normalizes API paths so callers can pass either:
 * - "/auth/login"
 * - "/api/auth/login"
 * without producing ".../api/api/..."
 */
function normalizeApiPath(path: string) {
  let p = path.trim();

  // Ensure leading slash
  if (!p.startsWith("/")) p = `/${p}`;

  // Strip a leading "/api" ONCE to prevent double-prefixing
  if (p === "/api") return "/";
  if (p.startsWith("/api/")) p = p.slice("/api".length);

  return p;
}

function joinUrl(baseUrl: string, path: string) {
  const base = baseUrl.replace(/\/+$/, "");
  const normalizedPath = normalizeApiPath(path).replace(/^\/+/, "");
  return normalizedPath ? `${base}/${normalizedPath}` : `${base}/`;
}

const apiRequest = async <T>(
  path: string,
  options: RequestInit = {}
): Promise<T> => {
  const baseUrl = requireApiBaseUrl();
  const token = getStoredAuthToken();

  const headers = new Headers(options.headers ?? {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const url = joinUrl(baseUrl, path);

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const payload = (await res.json()) as ApiEnvelope<T>;

  if (!res.ok) {
    const message = payload.error?.message ?? "Request failed";
    throw new ApiError(message, payload.requestId);
  }

  if (payload.data === undefined) {
    throw new ApiError("Malformed response from server.", payload.requestId);
  }

  return payload.data;
};

export const getRequestId = (error: unknown) =>
  error instanceof ApiError ? error.requestId : undefined;

export type ListingFilters = {
  state?: string;
  maxHours?: number;
  maxPrice?: number;
  operable?: boolean;
};

export const getHealth = () =>
  apiRequest<{ ok: boolean; mongoConfigured: boolean }>("/health");

export const getListings = (filters: ListingFilters) => {
  const params = new URLSearchParams();
  if (filters.state) params.set("state", filters.state);
  if (filters.maxHours) params.set("maxHours", String(filters.maxHours));
  if (filters.maxPrice) params.set("maxPrice", String(filters.maxPrice));
  if (filters.operable) params.set("operable", "true");
  const query = params.toString();
  return apiRequest<ListingWithScore[]>(
    `/listings${query ? `?${query}` : ""}`
  );
};

export const getListing = (id: string) =>
  apiRequest<ListingWithScore>(`/listings/${id}`);

export const getScoringConfig = () =>
  apiRequest<{ config: ScoringConfig }>("/scoring-configs");

export const getWatchlist = () =>
  apiRequest<{ items: WatchlistItem[] }>("/watchlist");

export const addToWatchlist = (listingId: string) =>
  apiRequest<{ item: WatchlistItem }>(`/watchlist/${listingId}`, {
    method: "POST",
  });

export const removeFromWatchlist = (listingId: string) =>
  apiRequest<{ removed: boolean }>(`/watchlist/${listingId}`, {
    method: "DELETE",
  });

// Legacy helper for internal usage
export const apiFetch = <T>(path: string, options: RequestInit = {}) =>
  apiRequest<T>(path, options);
