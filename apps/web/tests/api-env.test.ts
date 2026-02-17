import { describe, it, expect, vi, afterEach } from "vitest";

describe("api env handling", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unmock("../src/env");
  });

  it("builds auth URL with a single /api prefix", async () => {
    vi.resetModules();

    vi.doMock("../src/env", () => ({
      getApiBaseUrl: () => "https://example.com",
      requireApiBaseUrl: () => "https://example.com",
      getApiUrl: () => "https://example.com",
      requireApiUrl: () => "https://example.com",
    }));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: {} }),
    });

    global.fetch = fetchMock as any;

    const apiModule = await import("../src/lib/api");

    await apiModule.apiFetch("/auth/login", { method: "POST" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/api/auth/login",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("does not double-prefix /api", async () => {
    vi.resetModules();

    vi.doMock("../src/env", () => ({
      getApiBaseUrl: () => "https://example.com",
      requireApiBaseUrl: () => "https://example.com",
      getApiUrl: () => "https://example.com",
      requireApiUrl: () => "https://example.com",
    }));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: {} }),
    });

    global.fetch = fetchMock as any;

    const apiModule = await import("../src/lib/api");

    await apiModule.apiFetch("/api/auth/login", { method: "POST" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/api/auth/login",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("falls back safely if no env is defined", async () => {
    vi.resetModules();

    vi.doMock("../src/env", () => ({
      getApiBaseUrl: () => "http://127.0.0.1:8080",
      requireApiBaseUrl: () => "http://127.0.0.1:8080",
      getApiUrl: () => "http://127.0.0.1:8080",
      requireApiUrl: () => "http://127.0.0.1:8080",
    }));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: {} }),
    });

    global.fetch = fetchMock as any;

    const apiModule = await import("../src/lib/api");

    await apiModule.apiFetch("/api/auth/login", { method: "POST" });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8080/api/auth/login",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("keeps /api prefix when base URL is host-only", async () => {
    vi.resetModules();

    vi.doMock("../src/env", () => ({
      getApiBaseUrl: () => "http://127.0.0.1:8080",
      requireApiBaseUrl: () => "http://127.0.0.1:8080",
      getApiUrl: () => "http://127.0.0.1:8080",
      requireApiUrl: () => "http://127.0.0.1:8080",
    }));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: {} }),
    });

    global.fetch = fetchMock as any;

    const apiModule = await import("../src/lib/api");

    await apiModule.apiFetch("/api/auth/register", { method: "POST" });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8080/api/auth/register",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("prefixes /auth when base URL already includes /api", async () => {
    vi.resetModules();

    vi.doMock("../src/env", () => ({
      getApiBaseUrl: () => "https://example.com/api",
      requireApiBaseUrl: () => "https://example.com/api",
      getApiUrl: () => "https://example.com/api",
      requireApiUrl: () => "https://example.com/api",
    }));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: {} }),
    });

    global.fetch = fetchMock as any;

    const apiModule = await import("../src/lib/api");

    // Legacy callers without /api should still route into /api when base URL includes it.
    await apiModule.apiFetch("/auth/login", { method: "POST" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/api/auth/login",
      expect.objectContaining({ method: "POST" })
    );
  });


  it("buildApiUrl handles relative and absolute /api bases", async () => {
    vi.resetModules();

    vi.doMock("../src/env", () => ({
      getApiBaseUrl: () => "https://example.com",
      requireApiBaseUrl: () => "https://example.com",
      getApiUrl: () => "https://example.com",
      requireApiUrl: () => "https://example.com",
    }));

    const apiModule = await import("../src/lib/api");

    expect(apiModule.buildApiUrl("/seller/listings", "/api")).toBe("/api/seller/listings");
    expect(apiModule.buildApiUrl("/seller/listings", "https://x.com/api")).toBe("https://x.com/api/seller/listings");
    expect(apiModule.buildApiUrl("/seller/listings", "https://x.com")).toBe("https://x.com/api/seller/listings");
  });
  it("does not double-prefix when base URL is relative /api", async () => {
    vi.resetModules();

    vi.doMock("../src/env", () => ({
      getApiBaseUrl: () => "/api",
      requireApiBaseUrl: () => "/api",
      getApiUrl: () => "/api",
      requireApiUrl: () => "/api",
    }));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: {} }),
    });

    global.fetch = fetchMock as any;

    const apiModule = await import("../src/lib/api");

    await apiModule.apiFetch("/seller/listings", { method: "POST" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/seller/listings",
      expect.objectContaining({ method: "POST" })
    );
  });
});
