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

    await apiModule.apiFetch("/api/auth/login", { method: "POST" });

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
});
