import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
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

  it("omits helper copy, renders listing title, and uses 3-digit buyer alias", async () => {
    apiFetchMock.mockResolvedValue([
      {
        id: "inq-abcdef123456",
        listingId: "listing-123456",
        listingTitle: "2021 Caterpillar 310 Loader",
        buyerId: "buyer-123",
        buyerEmail: "hidden@example.com",
        messagePreview: "Still available?",
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
    expect(screen.queryByText("Buyer interest routed through EasyFinder (no direct seller contact shown to buyers)."))
      .not.toBeInTheDocument();
    expect(screen.getByText(/^Buyer #\d{3}$/)).toBeInTheDocument();
    expect(screen.queryByText("hidden@example.com")).not.toBeInTheDocument();
  });

  it("navigates to thread when clicking message preview", async () => {
    apiFetchMock.mockResolvedValue([
      {
        id: "inq-1",
        listingId: "listing-1",
        listingTitle: "Thread Listing",
        buyerId: "buyer-1",
        messagePreview: "Click me",
        status: "new",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);

    const user = userEvent.setup();
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/app/seller/inquiries"]}>
          <Routes>
            <Route path="/app/seller/inquiries" element={<SellerInquiries />} />
            <Route path="/app/seller/inquiries/:inquiryId" element={<div>Thread Loaded</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    const preview = await screen.findByRole("link", { name: "Click me" });
    await user.click(preview);
    expect(await screen.findByText("Thread Loaded")).toBeInTheDocument();
  });
});
