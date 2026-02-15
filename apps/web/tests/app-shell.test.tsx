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


describe("AppShell seller upload navigation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    localStorage.setItem(
      AUTH_SESSION_STORAGE_KEY,
      JSON.stringify({
        token: "jwt-seller",
      })
    );
    setRuntimeHealthMock({ demoMode: false, billingEnabled: false });
  });

  const renderSellerShell = () =>
    render(
      <AuthProvider>
        <RuntimeProvider>
          <MemoryRouter>
            <AppShell>
              <div>seller content</div>
            </AppShell>
          </MemoryRouter>
        </RuntimeProvider>
      </AuthProvider>
    );

  it("shows Upload listing for pro sellers", async () => {
    setTestFetchHandler(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/auth/me")) {
        return {
          ok: true,
          json: async () => ({
            data: {
              id: "seller-1",
              email: "seller@easyfinder.ai",
              name: "Seller",
              role: "seller",
              ndaAccepted: true,
              ndaAcceptedAt: null,
            },
          }),
        } as Response;
      }

      if (url.endsWith("/api/me")) {
        return {
          ok: true,
          json: async () => ({
            data: {
              billing: {
                plan: "pro",
                status: "active",
                current_period_end: "2099-01-01T00:00:00.000Z",
                entitlements: {
                  csvUpload: true,
                },
              },
            },
          }),
        } as Response;
      }

      return { ok: true, json: async () => ({ data: {} }) } as Response;
    });

    renderSellerShell();

    expect(await screen.findByRole("link", { name: "Upload listing" })).toBeInTheDocument();
  });

  it("hides Upload listing for free sellers", async () => {
    setTestFetchHandler(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/auth/me")) {
        return {
          ok: true,
          json: async () => ({
            data: {
              id: "seller-2",
              email: "seller-free@easyfinder.ai",
              name: "Seller Free",
              role: "seller",
              ndaAccepted: true,
              ndaAcceptedAt: null,
            },
          }),
        } as Response;
      }

      if (url.endsWith("/api/me")) {
        return {
          ok: true,
          json: async () => ({
            data: {
              billing: {
                plan: "free",
                status: "inactive",
                current_period_end: "1970-01-01T00:00:00.000Z",
                entitlements: {
                  csvUpload: false,
                },
              },
            },
          }),
        } as Response;
      }

      return { ok: true, json: async () => ({ data: {} }) } as Response;
    });

    renderSellerShell();

    expect(await screen.findByText("seller-free@easyfinder.ai")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Upload listing" })).not.toBeInTheDocument();
  });
});
