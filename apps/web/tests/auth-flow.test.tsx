import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, beforeEach, expect, it, vi } from "vitest";
import App from "../src/App";
import { AUTH_SESSION_STORAGE_KEY, AuthProvider } from "../src/lib/auth";

const renderApp = (initialEntries: string[]) => {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <App />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe("auth flow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("login stores session under one key and grants access to /app routes", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
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

      return {
        ok: true,
        json: async () => ({ data: {} }),
      } as Response;
    }) as unknown as typeof fetch;

    process.env.VITE_API_BASE_URL = "https://example.com";

    renderApp(["/login"]);

    await user.type(screen.getByPlaceholderText(/email/i), "buyer@easyfinder.ai");
    await user.type(screen.getByPlaceholderText(/password/i), "BuyerPass123!");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByPlaceholderText(/max hours/i)).toBeInTheDocument();

    const rawSession = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    expect(rawSession).toBeTruthy();
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();

    const session = JSON.parse(rawSession ?? "{}");
    expect(session.token).toBe("jwt-123");
    expect(session.user.email).toBe("buyer@easyfinder.ai");
  });

  it("RequireAuth allows /app/listings when session token exists", async () => {
    localStorage.setItem(
      AUTH_SESSION_STORAGE_KEY,
      JSON.stringify({
        token: "jwt-existing",
        user: { id: "u1", email: "buyer@easyfinder.ai", name: "Buyer", role: "buyer" },
      })
    );

    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/watchlist")) {
        return { ok: true, json: async () => ({ data: { items: [] } }) } as Response;
      }
      if (url.includes("/listings")) {
        return { ok: true, json: async () => ({ data: [] }) } as Response;
      }
      return { ok: true, json: async () => ({ data: {} }) } as Response;
    }) as unknown as typeof fetch;

    process.env.VITE_API_BASE_URL = "https://example.com";

    renderApp(["/app/listings"]);

    expect(await screen.findByPlaceholderText(/max hours/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: /sign in/i })).not.toBeInTheDocument();
    });
  });
});
