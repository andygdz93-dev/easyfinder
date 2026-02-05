import { describe, expect, it, vi, afterEach } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
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
});
