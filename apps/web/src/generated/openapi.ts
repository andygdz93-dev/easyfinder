/**
 * This file is auto-generated from ../../../../openapi.yml via `pnpm -w openapi:types`.
 * DO NOT EDIT MANUALLY.
 */

export interface paths {
  "/health": {
    get: unknown;
  };
  "/ready": {
    get: unknown;
  };
  "/api/cors-test": {
    get: unknown;
  };
  "/api/health": {
    get: unknown;
  };
  "/api/demo/listings": {
    get: unknown;
  };
  "/api/demo/listings/{id}": {
    get: unknown;
  };
  "/api/listings": {
    get: unknown;
    post: unknown;
    put: unknown;
    delete: unknown;
  };
  "/api/listings/{id}": {
    get: unknown;
  };
  "/api/scoring-configs": {
    get: unknown;
    post: unknown;
  };
  "/api/watchlist": {
    get: unknown;
  };
  "/api/watchlist/{listingId}": {
    post: unknown;
    delete: unknown;
  };
  "/api/offers": {
    post: unknown;
  };
  "/api/inquiries": {
    post: unknown;
  };
  "/api/auth/register": {
    post: unknown;
  };
  "/api/auth/login": {
    post: unknown;
  };
  "/api/auth/forgot-password": {
    post: unknown;
  };
  "/api/auth/reset-password": {
    post: unknown;
  };
  "/api/auth/me": {
    get: unknown;
  };
  "/api/admin/ingest/csv": {
    post: unknown;
  };
  "/api/admin/sources/sync": {
    post: unknown;
  };
  "/api/admin/sources": {
    get: unknown;
  };
  "/api/seller/inquiries": {
    get: unknown;
  };
  "/api/seller/insights": {
    get: unknown;
  };
  "/api/me": {
    get: unknown;
  };
  "/api/me/role": {
    patch: unknown;
  };
  "/api/nda/status": {
    get: unknown;
  };
  "/api/nda/accept": {
    post: unknown;
  };
  "/api/billing/create-checkout-session": {
    post: unknown;
  };
  "/api/billing/webhook": {
    post: unknown;
  };
}

export interface components {
  schemas: {
    ErrorEnvelope: unknown;
    HealthResponse: unknown;
    Listing: unknown;
    ScoreBreakdown: unknown;
    ListingsResponse: unknown;
    ListingResponse: unknown;
    WatchlistResponse: unknown;
    WatchlistItemResponse: unknown;
    WatchlistItem: unknown;
    RemovedResponse: unknown;
    ScoringConfigInput: unknown;
    ScoringConfigEnvelope: unknown;
    RegisterRequest: unknown;
    LoginRequest: unknown;
    AuthResponse: unknown;
    UserResponse: unknown;
    User: unknown;
    SuccessResponse: unknown;
    Inquiry: unknown;
    CreateInquiryRequest: unknown;
    InquiryResponse: unknown;
    UserMeResponse: unknown;
  };
  responses: Record<string, unknown>;
  parameters: Record<string, unknown>;
  requestBodies: Record<string, unknown>;
  headers: Record<string, unknown>;
  pathItems: Record<string, unknown>;
}

export interface operations {
  [operationId: string]: unknown;
}

export type $defs = Record<string, never>;
