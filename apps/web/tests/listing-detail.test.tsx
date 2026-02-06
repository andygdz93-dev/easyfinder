import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../src/lib/auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getListingMock = vi.fn();
const getWatchlistMock = vi.fn();
const addToWatchlistMock = vi.fn();

vi.mock("../src/lib/api", () => ({
  getListing: getListingMock,
  getWatchlist: getWatchlistMock,
  addToWatchlist: addToWatchlistMock,
  getRequestId: vi.fn(),
  ApiError: class ApiError extends Error {
    requestId?: string;

    constructor(message: string, requestId?: string) {
      super(message);
      this.name = "ApiError";
      this.requestId = requestId;
    }
  },
}));

describe("ListingDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getListingMock.mockResolvedValue({
      id: "listing-42",
      title: "API Detail Listing",
      description: "Detail pulled from API",
      state: "CA",
      price: 220000,
      hours: 3100,
      operable: true,
      category: "Crane",
      imageUrl: "/demo-images/cranes/1.jpg",
      images: [
        "/demo-images/cranes/1.jpg",
        "/demo-images/cranes/2.jpg",
        "/demo-images/cranes/3.jpg",
        "/demo-images/cranes/4.jpg",
        "/demo-images/cranes/5.jpg",
      ],
      source: "API",
      createdAt: "2024-01-01T00:00:00.000Z",
      totalScore: 88,
      scores: { operable: 25, hours: 21, price: 18, state: 24 },
      rationale: ["Strong regional demand", "Competitive pricing"],
    });
    getWatchlistMock.mockResolvedValue({ items: [] });
    addToWatchlistMock.mockResolvedValue({ item: { id: "1", listingId: "listing-42" } });
  });

  it("renders images, total score, breakdown, and rationale from API data", async () => {
    const { ListingDetail } = await import("../src/pages/app/ListingDetail");
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter initialEntries={["/app/listings/listing-42"]}>
            <Routes>
              <Route path="/app/listings/:id" element={<ListingDetail />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );

    expect(await screen.findByText("API Detail Listing")).toBeInTheDocument();
    expect(screen.getByText(/Score 88/i)).toBeInTheDocument();
    expect(screen.getByText("operable", { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/Strong regional demand/i)).toBeInTheDocument();
    expect(screen.getByAltText("API Detail Listing")).toBeInTheDocument();
  });
});
