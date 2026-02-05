import { afterEach, describe, expect, it, vi } from "vitest";
import { AUTH_SESSION_STORAGE_KEY } from "../src/lib/auth";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  vi.resetModules();
  vi.unmock("../src/env");
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  localStorage.clear();
  process.env = { ...ORIGINAL_ENV };
});

describe("api env handling", () => {
  it("uses localhost fallback when env is missing", async () => {
    vi.resetModules();
    delete process.env.VITE_API_URL;
    delete process.env.VITE_API_BASE_URL;

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { token: "t", user: { id: "1" } } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const apiModule = await import("../src/lib/api");
    await apiModule.apiFetch("/auth/login", { method: "POST" });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/auth/login",
      expect.objectContaining({ method: "POST" })
    );
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
      json: async () => ({ data: { token: "t", user: { id: "1" } } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const apiModule = await import("../src/lib/api");
    await apiModule.apiFetch("/auth/login", { method: "POST" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/api/auth/login",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("includes Authorization header when token exists", async () => {
    vi.resetModules();
    process.env.VITE_API_BASE_URL = "https://example.com/api";
    localStorage.setItem(
      AUTH_SESSION_STORAGE_KEY,
      JSON.stringify({
        token: "jwt-123",
        user: { id: "u1", email: "buyer@easyfinder.ai", name: "Buyer", role: "buyer" },
      })
    );

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const apiModule = await import("../src/lib/api");
    await apiModule.apiFetch("/listings");

    const call = fetchMock.mock.calls[0];
    const headers = call[1]?.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer jwt-123");
  });
});
