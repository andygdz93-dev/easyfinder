import { describe, expect, it, vi, afterEach } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("env helpers", () => {
  it("importing env module does not throw when env vars are missing", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_API_URL", "");
    vi.stubEnv("VITE_API_BASE_URL", "");

    await expect(import("../src/env")).resolves.toBeTruthy();
  });

  it("getApiBaseUrl returns null when env vars are missing", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_API_URL", "");
    vi.stubEnv("VITE_API_BASE_URL", "");

    const module = await import("../src/env");
    expect(module.getApiBaseUrl()).toBeNull();
  });
});
