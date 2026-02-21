import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SellerInquiries from "../src/pages/app/SellerInquiries";

const { apiFetchMock, useAuthMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  useAuthMock: vi.fn(),
}));

vi.mock("../src/lib/api", async () => {
  const actual = await vi.importActual<typeof import("../src/lib/api")>("../src/lib/api");
  return {
    ...actual,
    apiFetch: apiFetchMock,
  };
});

vi.mock("../src/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("../src/lib/auth")>("../src/lib/auth");
  return {
    ...actual,
    useAuth: useAuthMock,
  };
});

describe("SellerInquiries blind marketplace rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({
      token: "jwt-seller",
      user: { role: "seller" },
    });
  });

  it("shows listing title and anonymized buyer label without buyer email", async () => {
    apiFetchMock.mockResolvedValue([
      {
        id: "inq-abcdef123456",
        listingId: "listing-123456",
        listingTitle: "2021 Caterpillar 310 Loader",
        buyerEmail: "hidden@example.com",
        message: "Still available?",
        status: "new",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);

    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SellerInquiries />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText("2021 Caterpillar 310 Loader")).toBeInTheDocument();
    expect(screen.getByText("Buyer #123456")).toBeInTheDocument();
    expect(screen.queryByText("hidden@example.com")).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Listing" })).toBeInTheDocument();
  });
});
