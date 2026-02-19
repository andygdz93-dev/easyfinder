import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "../src/components/AppShell";
import { AUTH_SESSION_STORAGE_KEY, AuthProvider } from "../src/lib/auth";
import { RuntimeProvider } from "../src/lib/runtime";
import AdminLayout from "../src/layouts/AdminLayout";

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

  const renderSellerShell = (initialEntries: string[] = ["/app/seller/dashboard"]) =>
    render(
      <AuthProvider>
        <RuntimeProvider>
          <MemoryRouter initialEntries={initialEntries}>
            <AppShell>
              <div>seller content</div>
            </AppShell>
          </MemoryRouter>
        </RuntimeProvider>
      </AuthProvider>
    );


  it("renders buyer role badge labels in buyer routes", async () => {
    setTestFetchHandler(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/auth/me")) {
        return {
          ok: true,
          json: async () => ({
            data: {
              id: "buyer-1",
              email: "buyer@easyfinder.ai",
              name: "Buyer",
              role: "buyer",
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
                status: "active",
                current_period_end: "2099-01-01T00:00:00.000Z",
              },
            },
          }),
        } as Response;
      }

      return { ok: true, json: async () => ({ data: {} }) } as Response;
    });

    renderSellerShell(["/app/listings"]);

    expect(await screen.findByText("Role: Buyer")).toBeInTheDocument();
  });

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
    expect(await screen.findByText("Role: Seller")).toBeInTheDocument();
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

  it("renders admin console nav without global app sidebar", async () => {
    setTestFetchHandler(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/auth/me")) {
        return {
          ok: true,
          json: async () => ({
            data: {
              id: "admin-1",
              email: "admin@easyfinder.ai",
              name: "Admin",
              role: "admin",
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
              role: "admin",
              billing: {
                plan: "free",
                status: "active",
                current_period_end: "2099-01-01T00:00:00.000Z",
              },
            },
          }),
        } as Response;
      }

      return { ok: true, json: async () => ({ data: {} }) } as Response;
    });

    render(
      <AuthProvider>
        <RuntimeProvider>
          <MemoryRouter initialEntries={["/app/admin"]}>
            <AppShell>
              <Routes>
                <Route path="/app/admin" element={<AdminLayout />}>
                  <Route index element={<div>admin content</div>} />
                </Route>
              </Routes>
            </AppShell>
          </MemoryRouter>
        </RuntimeProvider>
      </AuthProvider>
    );

    expect((await screen.findAllByRole("heading", { name: "Admin Console" })).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Offers" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Scoring" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    expect(screen.queryByText("Easy Finder AI")).not.toBeInTheDocument();
    expect(screen.queryByText("Buyer")).not.toBeInTheDocument();
    expect(screen.queryByText("Seller")).not.toBeInTheDocument();
    expect(screen.queryByText("Welcome to Easy Finder AI")).not.toBeInTheDocument();
  });
});
