import { expect, it, vi } from "vitest";

it("falls back to localhost api base url", async () => {
  vi.resetModules();
  delete process.env.VITE_API_BASE_URL;
  const module = await import("../src/env");
  expect(module.env.apiBaseUrl).toBe("http://localhost:8080/api");
});
