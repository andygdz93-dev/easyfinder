import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  process.env = { ...ORIGINAL_ENV };
});

describe("env helpers", () => {
  it("importing env module does not throw when env vars are missing", async () => {
    vi.resetModules();
    delete process.env.VITE_API_URL;
    delete process.env.VITE_API_BASE_URL;

    await expect(import("../src/env")).resolves.toBeTruthy();
  });

  it("getApiBaseUrl returns localhost fallback when env vars are missing", async () => {
    vi.resetModules();
    delete process.env.VITE_API_URL;
    delete process.env.VITE_API_BASE_URL;

    const module = await import("../src/env");
    expect(module.getApiBaseUrl()).toBe("http://localhost:8080");
  });
});
