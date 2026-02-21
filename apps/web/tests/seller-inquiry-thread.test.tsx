import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SellerInquiryThread from "../src/pages/app/SellerInquiryThread";

const { getSellerInquiryThreadMock, sendSellerInquiryMessageMock } = vi.hoisted(() => ({
  getSellerInquiryThreadMock: vi.fn(),
  sendSellerInquiryMessageMock: vi.fn(),
}));

vi.mock("../src/lib/api", async () => {
  const actual = await vi.importActual<typeof import("../src/lib/api")>("../src/lib/api");
  return {
    ...actual,
    getSellerInquiryThread: getSellerInquiryThreadMock,
    sendSellerInquiryMessage: sendSellerInquiryMessageMock,
  };
});

describe("SellerInquiryThread", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSellerInquiryThreadMock.mockResolvedValue({
      id: "inq-1",
      listingId: "listing-1",
      listingTitle: "Thread Listing",
      buyerId: "buyer-1",
      status: "new",
      createdAt: "2026-01-01T00:00:00.000Z",
      messages: [
        { id: "m-1", senderRole: "buyer", body: "Initial buyer message", createdAt: "2026-01-01T00:00:00.000Z" },
      ],
    });
  });

  it("appends seller reply from mutation response and clears input", async () => {
    sendSellerInquiryMessageMock.mockResolvedValue({
      id: "inq-1",
      messages: [
        { id: "m-1", senderRole: "buyer", body: "Initial buyer message", createdAt: "2026-01-01T00:00:00.000Z" },
        { id: "m-2", senderRole: "seller", body: "Seller follow-up", createdAt: "2026-01-01T01:00:00.000Z" },
      ],
    });

    const user = userEvent.setup();
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/app/seller/inquiries/inq-1"]}>
          <Routes>
            <Route path="/app/seller/inquiries/:inquiryId" element={<SellerInquiryThread />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText("Initial buyer message")).toBeInTheDocument();
    const input = screen.getByPlaceholderText("Write your reply");
    await user.type(input, "Seller follow-up");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("Seller follow-up")).toBeInTheDocument();
    await waitFor(() => {
      expect((input as HTMLTextAreaElement).value).toBe("");
    });
  });
});
