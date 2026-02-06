import { describe, it, expect, vi, afterEach } from "vitest";
import { fileURLToPath } from "node:url";

describe("api env handling", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("builds auth URL with a single /api prefix", async () => {
    // Resolve the exact env.ts path so the mock matches api.ts import
    const ENV_PATH = fileURLToPath(
      new URL("../src/env.ts", import.meta.url)
    );

    vi.doMock(ENV_PATH, () => ({
      getApiBaseUrl: () => "https://example.com/api",
      requireApiBaseUrl: () => "https://example.com/api",
      getApiUrl: () => "https://example.com/api",
      requireApiUrl: () => "https://example.com/api",
    }));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: {} }),
    });

    // @ts-ignore
    global.fetch = fetchMock;

    const apiModule = await import("../src/lib/api");

    await apiModule.apiFetch("/auth/login", { method: "POST" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/api/auth/login",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("uses fallback base URL when env not set", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: {} }),
    });

    // @ts-ignore
    global.fetch = fetchMock;

    const apiModule = await import("../src/lib/api");

    await apiModule.apiFetch("/auth/login", { method: "POST" });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/auth/login",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("does not double-prefix /api", async () => {
    const ENV_PATH = fileURLToPath(
      new URL("../src/env.ts", import.meta.url)
    );

    vi.doMock(ENV_PATH, () => ({
      getApiBaseUrl: () => "https://example.com/api",
      requireApiBaseUrl: () => "https://example.com/api",
      getApiUrl: () => "https://example.com/api",
      requireApiUrl: () => "https://example.com/api",
    }));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: {} }),
    });

    // @ts-ignore
    global.fetch = fetchMock;

    const apiModule = await import("../src/lib/api");

    await apiModule.apiFetch("/api/auth/login", { method: "POST" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/api/auth/login",
      expect.objectContaining({ method: "POST" })
    );
  });
});
