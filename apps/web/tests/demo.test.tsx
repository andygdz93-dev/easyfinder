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

    expect(await screen.findByTestId("score-breakdown")).toBeInTheDocument();
    expect(screen.getByText(/why this score/i)).toBeInTheDocument();
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
});
