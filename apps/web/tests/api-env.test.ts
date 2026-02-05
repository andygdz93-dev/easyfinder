import { describe, expect, it, vi, afterEach } from "vitest";
import { AUTH_SESSION_STORAGE_KEY } from "../src/lib/auth";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  localStorage.clear();
});

describe("api env handling", () => {
  it("requireApiBaseUrl throws when called and env is missing", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_API_URL", "");
    vi.stubEnv("VITE_API_BASE_URL", "");

    const apiModule = await import("../src/lib/api");

    await expect(apiModule.apiFetch("/auth/login", { method: "POST" })).rejects.toThrow(
      "VITE_API_BASE_URL is required"
    );
  });

  it("builds auth URL with a single /api prefix", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_API_BASE_URL", "https://example.com/api");

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
    vi.stubEnv("VITE_API_BASE_URL", "https://example.com/api");
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
