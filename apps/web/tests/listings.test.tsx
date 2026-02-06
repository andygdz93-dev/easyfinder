import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../src/lib/auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getListingsMock = vi.fn();
const getWatchlistMock = vi.fn();
const addToWatchlistMock = vi.fn();

vi.mock("../src/lib/api", () => ({
  getListings: getListingsMock,
  getWatchlist: getWatchlistMock,
  addToWatchlist: addToWatchlistMock,
  getRequestId: vi.fn(),
}));

const renderWithProviders = (ListingsComponent: React.ComponentType) => {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter>
          <ListingsComponent />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe("Listings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getListingsMock.mockResolvedValue([
      {
        id: "listing-1",
        title: "API Listing",
        description: "Fetched from API",
        state: "TX",
        price: 100000,
        hours: 4200,
        operable: true,
        category: "Telehandler",
        imageUrl: "/demo-images/telehandlers/1.jpg",
        images: [
          "/demo-images/telehandlers/1.jpg",
          "/demo-images/telehandlers/2.jpg",
          "/demo-images/telehandlers/3.jpg",
          "/demo-images/telehandlers/4.jpg",
          "/demo-images/telehandlers/5.jpg",
        ],
        source: "API",
        createdAt: "2024-01-01T00:00:00.000Z",
        totalScore: 91,
        scores: { operable: 25, hours: 22, price: 20, state: 24 },
        rationale: ["Strong fit"],
      },
    ]);
    getWatchlistMock.mockResolvedValue({ items: [] });
    addToWatchlistMock.mockResolvedValue({ item: { id: "1", listingId: "listing-1" } });
  });

  it("renders listings from API data", async () => {
    const { Listings } = await import("../src/pages/app/Listings");
    renderWithProviders(Listings);

    expect(await screen.findByText("API Listing")).toBeInTheDocument();
    expect(screen.getByText("Fetched from API")).toBeInTheDocument();
    expect(screen.getByText("91")).toBeInTheDocument();
  });
});
