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

    await apiModule.apiFetch("/auth/login", { method: "POST" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/api/auth/login",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("does not double-prefix /api", async () => {
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

    await apiModule.apiFetch("/api/auth/login", { method: "POST" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/api/auth/login",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("falls back safely if no env is defined", async () => {
    vi.resetModules();

    vi.doMock("../src/env", () => ({
      getApiBaseUrl: () => "http://localhost:8080",
      requireApiBaseUrl: () => "http://localhost:8080",
      getApiUrl: () => "http://localhost:8080",
      requireApiUrl: () => "http://localhost:8080",
    }));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: {} }),
    });

    global.fetch = fetchMock as any;

    const apiModule = await import("../src/lib/api");

    await apiModule.apiFetch("/auth/login", { method: "POST" });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/auth/login",
      expect.objectContaining({ method: "POST" })
    );
  });
});
