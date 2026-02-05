import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "../src/App";
import Demo from "../src/pages/Demo";

describe("Demo experience", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders listings with hero and carousel images", () => {
    render(
      <MemoryRouter>
        <Demo />
      </MemoryRouter>
    );

    const cards = screen.getAllByTestId("listing-card");
    expect(cards.length).toBeGreaterThan(0);

    cards.forEach((card) => {
      const hero = within(card).getByTestId("listing-hero") as HTMLImageElement;
      expect(hero.src).toBeTruthy();

      const thumbs = within(card).getAllByTestId("listing-thumb") as HTMLImageElement[];
      expect(thumbs).toHaveLength(4);
      thumbs.forEach((thumb) => {
        expect(thumb.src).toBeTruthy();
      });
    });
  });

  it("navigates to detail view with scoring breakdown", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/demo"]}>
        <App />
      </MemoryRouter>
    );

    const viewLinks = await screen.findAllByRole("link", { name: /view details/i });
    await user.click(viewLinks[0]);

    expect(await screen.findByTestId("demo-detail-breakdown")).toBeInTheDocument();
    expect(screen.getByText(/total score/i)).toBeInTheDocument();
    expect(screen.getAllByText("Operable").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Hours").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Price").length).toBeGreaterThan(0);
    expect(screen.getAllByText("State").length).toBeGreaterThan(0);
    expect(screen.getByText(/why this score/i)).toBeInTheDocument();
    const rationaleItems = screen.getAllByRole("listitem");
    expect(rationaleItems.length).toBeGreaterThan(0);
    const detailImages = screen.getAllByRole("img");
    expect(detailImages.length).toBeGreaterThanOrEqual(5);
  });

  it("persists watchlist toggles in localStorage", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <MemoryRouter>
        <Demo />
      </MemoryRouter>
    );

    const cards = screen.getAllByTestId("listing-card");
    const firstCard = cards[0];
    const toggleButton = within(firstCard).getByRole("button", { name: /add to watchlist/i });

    await user.click(toggleButton);

    const stored = JSON.parse(window.localStorage.getItem("easyfinder_demo_watchlist") ?? "[]");
    expect(stored.length).toBe(1);

    unmount();

    render(
      <MemoryRouter>
        <Demo />
      </MemoryRouter>
    );

    const refreshedCard = screen.getAllByTestId("listing-card")[0];
    await waitFor(() => {
      expect(
        within(refreshedCard).getByRole("button", { name: /remove from watchlist/i })
      ).toBeInTheDocument();
    });
  });

  it("renders saved listings on the watchlist route", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <MemoryRouter>
        <Demo />
      </MemoryRouter>
    );

    const firstCard = screen.getAllByTestId("listing-card")[0];
    const listingTitle = within(firstCard).getByRole("heading").textContent;
    await user.click(
      within(firstCard).getByRole("button", { name: /add to watchlist/i })
    );

    unmount();

    render(
      <MemoryRouter initialEntries={["/demo/watchlist"]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByText(/saved opportunities/i)).toBeInTheDocument();
    if (listingTitle) {
      expect(screen.getByText(listingTitle)).toBeInTheDocument();
    }
  });

  it("swaps hero image when clicking a detail thumbnail", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/demo/demo-22"]}>
        <App />
      </MemoryRouter>
    );

    const hero = await screen.findByTestId("demo-hero") as HTMLImageElement;
    const thumb1 = await screen.findByTestId("demo-thumb-1");
    const thumb1Image = within(thumb1).getByRole("img") as HTMLImageElement;

    const initialHeroSrc = hero.src;
    const initialThumbSrc = thumb1Image.src;

    await user.click(thumb1);

    expect((screen.getByTestId("demo-hero") as HTMLImageElement).src).toBe(initialThumbSrc);
    expect((within(screen.getByTestId("demo-thumb-1")).getByRole("img") as HTMLImageElement).src).toBe(initialHeroSrc);
  });

  it("renders demo detail route without API env vars", async () => {
    const previousUrl = process.env.VITE_API_URL;
    const previousBase = process.env.VITE_API_BASE_URL;
    delete process.env.VITE_API_URL;
    delete process.env.VITE_API_BASE_URL;

    render(
      <MemoryRouter initialEntries={["/demo/demo-22"]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByText(/2017 Genie GTH-1056 Telehandler/i)).toBeInTheDocument();

    process.env.VITE_API_URL = previousUrl;
    process.env.VITE_API_BASE_URL = previousBase;
  });

});
