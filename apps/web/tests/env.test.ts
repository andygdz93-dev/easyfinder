import { describe, expect, it, vi } from "vitest";

describe("env helpers", () => {
  it("getApiUrl returns null when env vars are missing", async () => {
    vi.resetModules();
    delete process.env.VITE_API_URL;
    delete process.env.VITE_API_BASE_URL;

    const module = await import("../src/env");
    expect(module.getApiUrl()).toBeNull();
  });

  it("requireApiUrl throws only when called", async () => {
    vi.resetModules();
    delete process.env.VITE_API_URL;
    delete process.env.VITE_API_BASE_URL;

    const module = await import("../src/env");
    expect(() => module.requireApiUrl()).toThrow("VITE_API_URL is required");
  });
});
