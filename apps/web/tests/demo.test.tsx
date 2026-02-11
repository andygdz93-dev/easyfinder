import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "../src/App";
import { AuthProvider } from "../src/lib/auth";
import { RuntimeProvider } from "../src/lib/runtime";
import DemoListings from "../src/pages/demo/Listings";

describe("Demo experience", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setRuntimeHealthMock({ demoMode: true, billingEnabled: false });
  });

  it("renders listings with hero and carousel images", () => {
    render(
      <MemoryRouter>
        <DemoListings />
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

  it("keeps /demo public when unauthenticated", async () => {
    render(
      <MemoryRouter initialEntries={["/demo"]}>
        <AuthProvider>
          <RuntimeProvider>
            <App />
          </RuntimeProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("heading", { name: /buyer experience walkthrough/i })
    ).toBeInTheDocument();
    expect(screen.getByText("DEMO MODE")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /sign in/i })).not.toBeInTheDocument();
  });

  it("redirects unauthenticated users from /app/listings to /login", async () => {
    render(
      <MemoryRouter initialEntries={["/app/listings"]}>
        <AuthProvider>
          <RuntimeProvider>
            <App />
          </RuntimeProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: /sign in/i })).toBeInTheDocument();
  });

  it("renders seller tour in read-only mode when demo runtime is enabled", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/demo/tour"]}>
        <AuthProvider>
          <RuntimeProvider>
            <App />
          </RuntimeProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await user.click(await screen.findByLabelText("Seller"));
    await user.click(screen.getByRole("button", { name: /start seller tour/i }));

    for (let index = 0; index < 6; index += 1) {
      if (screen.queryByText("Creating or modifying listings is disabled in demo mode.")) {
        break;
      }
      await user.click(screen.getByRole("button", { name: "Next" }));
    }

    expect(
      await screen.findByText("Creating or modifying listings is disabled in demo mode.")
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Uploading listings is disabled in demo mode.")).toBeInTheDocument();
  });

  it("persists watchlist toggles in localStorage", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <MemoryRouter>
        <DemoListings />
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
        <DemoListings />
      </MemoryRouter>
    );

    const refreshedCard = screen.getAllByTestId("listing-card")[0];
    await waitFor(() => {
      expect(
        within(refreshedCard).getByRole("button", { name: /remove from watchlist/i })
      ).toBeInTheDocument();
    });
  });

  it("renders demo detail route without API env vars", async () => {
    const previousUrl = process.env.VITE_API_URL;
    const previousBase = process.env.VITE_API_BASE_URL;
    delete process.env.VITE_API_URL;
    delete process.env.VITE_API_BASE_URL;

    render(
      <MemoryRouter initialEntries={["/demo/tour"]}>
        <AuthProvider>
          <RuntimeProvider>
            <App />
          </RuntimeProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText(/demo tour/i)).toBeInTheDocument();

    process.env.VITE_API_URL = previousUrl;
    process.env.VITE_API_BASE_URL = previousBase;
  });
});
