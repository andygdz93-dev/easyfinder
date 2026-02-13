import {
  Listing,
  ScoreBreakdown,
  ScoringConfig,
  WatchlistItem,
} from "@easyfinderai/shared";
import { requireApiBaseUrl } from "../env";
import { clearStoredSession, getStoredAuthToken } from "./auth";
import { Billing } from "./billing";

type ApiEnvelope<T> = {
  data?: T;
  error?: { code: string; message: string };
  requestId?: string;
};

export type ListingWithScore = Listing & {
  totalScore: number;
  score: ScoreBreakdown;
};

export type NdaStatus = {
  accepted: boolean;
  acceptedAt?: string;
  ndaVersion?: string;
};

export type MeResponse = {
  id: string;
  email: string;
  name: string;
  role: "demo" | "buyer" | "seller" | "enterprise" | "admin" | null;
  ndaAccepted?: boolean;
  ndaAcceptedAt?: string | null;
  billing?: Billing;
};

export class ApiError extends Error {
  requestId?: string;
  status?: number;

  constructor(message: string, requestId?: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.requestId = requestId;
    this.status = status;
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
  if (p === "/") return "";

  return p;
}

function baseHasApiPrefix(baseUrl: string) {
  let hasApiPrefix = false;
  try {
    const parsed = new URL(baseUrl);
    const normalizedPathname = parsed.pathname.replace(/\/+$/, "");
    hasApiPrefix = normalizedPathname === "/api";
  } catch {
    hasApiPrefix = false;
  }
  return hasApiPrefix;
}

export function buildApiUrl(path: string, baseUrl = requireApiBaseUrl()) {
  const base = baseUrl.replace(/\/+$/, "");
  const hasApiPrefix = baseHasApiPrefix(baseUrl);
  let normalizedPath = normalizeApiPath(path);

  if (import.meta.env.DEV && hasApiPrefix && normalizedPath.startsWith("/api/")) {
    console.warn(
      "[api] base URL already includes /api; stripping duplicate /api from path."
    );
  }

  if (hasApiPrefix) {
    if (normalizedPath === "/api") {
      normalizedPath = "";
    } else if (normalizedPath.startsWith("/api/")) {
      normalizedPath = normalizedPath.slice("/api".length);
    }
    return normalizedPath ? `${base}${normalizedPath}` : base;
  }

  if (normalizedPath === "") {
    return `${base}/api`;
  }
  if (!normalizedPath.startsWith("/api/")) {
    normalizedPath = `/api${normalizedPath}`;
  }

  return `${base}${normalizedPath}`;
}

type ApiRequestOptions = RequestInit & {
  timeoutMs?: number;
};

const apiRequest = async <T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> => {
  const baseUrl = requireApiBaseUrl();
  const token = getStoredAuthToken();
  const { timeoutMs, signal, ...fetchOptions } = options;

  const headers = new Headers(fetchOptions.headers ?? {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const url = buildApiUrl(path, baseUrl);
  const controller = new AbortController();
  if (signal) {
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  const timeoutId =
    typeof timeoutMs === "number" && timeoutMs > 0
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;

  let res: Response;
  try {
    res = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("Request timed out. Please try again.");
    }
    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }

  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = (await res.json()) as ApiEnvelope<T>;
  } catch {
    payload = null;
  }

  if (res.status === 401) {
    clearStoredSession();
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      const isAuthRoute =
        path.startsWith("/login") ||
        path.startsWith("/register") ||
        path.startsWith("/app/login") ||
        path.startsWith("/app/register");
      if (!isAuthRoute) {
        window.location.assign("/login");
      }
    }
  }

  if (!res.ok) {
    const message = payload?.error?.message ?? "Request failed";
    throw new ApiError(message, payload?.requestId, res.status);
  }

  if (!payload || payload.data === undefined) {
    throw new ApiError(
      "Malformed response from server.",
      payload?.requestId,
      res.status
    );
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

export type HealthResponse = {
  ok: boolean;
  demoMode: boolean;
  billingEnabled: boolean;
};

const buildHealthUrl = (baseUrl = requireApiBaseUrl()) => {
  try {
    const url = new URL(baseUrl);
    const withoutTrailingSlash = url.pathname.replace(/\/+$/, "");
    if (withoutTrailingSlash === "/api") {
      url.pathname = "/health";
    } else {
      url.pathname = `${withoutTrailingSlash || ""}/health`;
    }
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    const normalized = baseUrl.replace(/\/+$/, "");
    if (normalized.endsWith("/api")) {
      return `${normalized.slice(0, -4)}/health`;
    }
    return `${normalized}/health`;
  }
};

export const getHealth = async (): Promise<HealthResponse> => {
  const res = await fetch(buildHealthUrl(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new ApiError("Unable to load backend health.", undefined, res.status);
  }

  const payload = (await res.json()) as HealthResponse;
  return payload;
};

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

export const getNdaStatus = () =>
  apiFetch<NdaStatus>("/nda/status", { timeoutMs: 10000 });

export const acceptNda = () =>
  apiFetch<NdaStatus>("/nda/accept", {
    method: "POST",
    body: JSON.stringify({ accepted: true }),
    timeoutMs: 10000,
  });

export const getMe = () => apiRequest<MeResponse>("/me");

export const createCheckoutSession = (plan: "pro" | "enterprise") =>
  apiRequest<{ url: string }>("/billing/create-checkout-session", {
    method: "POST",
    body: JSON.stringify({ plan }),
  });

// Legacy helper for internal usage
export const apiFetch = <T>(path: string, options: ApiRequestOptions = {}) =>
  apiRequest<T>(path, options);
