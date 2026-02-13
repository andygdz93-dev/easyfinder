import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "../src/components/AppShell";
import { AUTH_SESSION_STORAGE_KEY, AuthProvider } from "../src/lib/auth";
import { RuntimeProvider } from "../src/lib/runtime";

describe("AppShell NDA warning", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    localStorage.setItem(
      AUTH_SESSION_STORAGE_KEY,
      JSON.stringify({
        token: "jwt-123",
      })
    );
    setRuntimeHealthMock({ demoMode: false, billingEnabled: false });
  });

  it("renders the NDA warning text exactly once", async () => {
    setTestFetchHandler(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/auth/me")) {
        return {
          ok: true,
          json: async () => ({
            data: {
              id: "u1",
              email: "buyer@easyfinder.ai",
              name: "Buyer",
              role: "buyer",
              ndaAccepted: false,
              ndaAcceptedAt: null,
            },
          }),
        } as Response;
      }

      if (url.endsWith("/api/me")) {
        return {
          ok: false,
          json: async () => ({
            error: {
              code: "NDA_REQUIRED",
              message: "NDA must be accepted before accessing this resource.",
            },
          }),
        } as Response;
      }

      return {
        ok: true,
        json: async () => ({ data: {} }),
      } as Response;
    });

    render(
      <AuthProvider>
        <RuntimeProvider>
          <MemoryRouter>
            <AppShell>
              <div>content</div>
            </AppShell>
          </MemoryRouter>
        </RuntimeProvider>
      </AuthProvider>
    );

    const warning = await screen.findAllByText(
      "NDA must be accepted before accessing this resource."
    );
    expect(warning).toHaveLength(1);
  });
});
