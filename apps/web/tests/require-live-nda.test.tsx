import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type React from "react";
import { AuthProvider } from "../src/lib/auth";

const AUTH_SESSION_STORAGE_KEY = "easyfinder_auth_session";

const renderGuard = async (
  initialEntries: string[],
  RequireLiveNda: React.ComponentType
) => {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/app/*" element={<RequireLiveNda />}>
            <Route path="listings" element={<div>Listings content</div>} />
            <Route path="nda" element={<div>NDA Page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
};

describe("RequireLiveNda", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem(
      AUTH_SESSION_STORAGE_KEY,
      JSON.stringify({
        token: "jwt-123",
      })
    );
  });

  it("redirects to /app/nda when NDA is not accepted", async () => {
    const { RequireLiveNda } = await import("../src/components/RequireLiveNda");

    globalThis.setTestFetchHandler(() =>
      new Response(
        JSON.stringify({
          data: {
            id: "u1",
            email: "buyer@easyfinder.ai",
            name: "Buyer",
            role: "buyer",
            ndaAccepted: false,
            ndaAcceptedAt: null,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    await renderGuard(["/app/listings"], RequireLiveNda);

    expect(await screen.findByText("NDA Page")).toBeInTheDocument();
  });

  it("renders listings when NDA is accepted", async () => {
    const { RequireLiveNda } = await import("../src/components/RequireLiveNda");

    globalThis.setTestFetchHandler(() =>
      new Response(
        JSON.stringify({
          data: {
            id: "u1",
            email: "buyer@easyfinder.ai",
            name: "Buyer",
            role: "buyer",
            ndaAccepted: true,
            ndaAcceptedAt: null,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    await renderGuard(["/app/listings"], RequireLiveNda);

    expect(await screen.findByText("Listings content")).toBeInTheDocument();
  });
});
