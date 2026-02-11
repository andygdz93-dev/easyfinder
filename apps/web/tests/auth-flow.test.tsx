import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, beforeEach, expect, it, vi } from "vitest";
import App from "../src/App";
import { AUTH_SESSION_STORAGE_KEY, AuthProvider } from "../src/lib/auth";
import { RuntimeProvider } from "../src/lib/runtime";

const renderApp = (initialEntries: string[]) => {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RuntimeProvider>
          <MemoryRouter initialEntries={initialEntries}>
            <App />
          </MemoryRouter>
        </RuntimeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe("auth flow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    setRuntimeHealthMock({ demoMode: false, billingEnabled: false });
  });

  it("login stores session under one key and hides seller write actions in demo runtime", async () => {
    const user = userEvent.setup();
    setRuntimeHealthMock({ demoMode: true, billingEnabled: false });
    setTestFetchHandler(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/auth/login")) {
        return {
          ok: true,
          json: async () => ({
            data: {
              token: "jwt-123",
              user: {
                id: "u1",
                email: "buyer@easyfinder.ai",
                name: "Buyer",
                role: "buyer",
              },
            },
          }),
        } as Response;
      }

      if (url.endsWith("/api/auth/me")) {
        return {
          ok: true,
          json: async () => ({
            data: {
              id: "u1",
              email: "buyer@easyfinder.ai",
              name: "Buyer",
              role: "buyer",
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
              },
            },
          }),
        } as Response;
      }

      if (url.includes("/listings")) {
        return {
          ok: true,
          json: async () => ({ data: [] }),
        } as Response;
      }

      if (url.includes("/watchlist")) {
        return {
          ok: true,
          json: async () => ({ data: { items: [] } }),
        } as Response;
      }

      if (url.includes("/nda/status")) {
        return {
          ok: true,
          json: async () => ({ data: { accepted: true } }),
        } as Response;
      }

      return {
        ok: true,
        json: async () => ({ data: {} }),
      } as Response;
    });

    process.env.VITE_API_BASE_URL = "https://example.com";

    renderApp(["/login"]);

    await user.type(screen.getByPlaceholderText(/email/i), "buyer@easyfinder.ai");
    await user.type(screen.getByPlaceholderText(/password/i), "BuyerPass123!");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByPlaceholderText(/max hours/i)).toBeInTheDocument();
    expect(
      screen.getByText("DEMO MODE — All data is simulated and not saved")
    ).toBeInTheDocument();

    expect(screen.queryByRole("link", { name: "Add listing" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Upload listing" })).not.toBeInTheDocument();

    const rawSession = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    expect(rawSession).toBeTruthy();
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();

    const session = JSON.parse(rawSession ?? "{}");
    expect(session.token).toBe("jwt-123");
    expect(rawSession).toContain("jwt-123");
    expect(await screen.findByText("buyer@easyfinder.ai")).toBeInTheDocument();
  });

  it("RequireAuth allows /app/listings when session token exists", async () => {
    localStorage.setItem(
      AUTH_SESSION_STORAGE_KEY,
      JSON.stringify({
        token: "jwt-existing",
      })
    );

    setTestFetchHandler(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/me")) {
        return {
          ok: true,
          json: async () => ({
            data: {
              billing: {
                plan: "pro",
                status: "active",
                current_period_end: "2099-01-01T00:00:00.000Z",
              },
            },
          }),
        } as Response;
      }
      if (url.endsWith("/api/auth/me")) {
        return {
          ok: true,
          json: async () => ({
            data: {
              id: "u1",
              email: "buyer@easyfinder.ai",
              name: "Buyer",
              role: "buyer",
            },
          }),
        } as Response;
      }
      if (url.includes("/watchlist")) {
        return { ok: true, json: async () => ({ data: { items: [] } }) } as Response;
      }
      if (url.includes("/nda/status")) {
        return { ok: true, json: async () => ({ data: { accepted: true } }) } as Response;
      }
      if (url.includes("/listings")) {
        return { ok: true, json: async () => ({ data: [] }) } as Response;
      }
      return { ok: true, json: async () => ({ data: {} }) } as Response;
    });

    process.env.VITE_API_BASE_URL = "https://example.com";

    renderApp(["/app/listings"]);

    expect(await screen.findByPlaceholderText(/max hours/i)).toBeInTheDocument();
    expect(await screen.findByText("buyer@easyfinder.ai")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: /sign in/i })).not.toBeInTheDocument();
    });
  });
});
