import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Landing } from "../src/pages/Landing";

it("renders landing page with demo entry", () => {
  render(
    <MemoryRouter>
      <Landing />
    </MemoryRouter>
  );
  expect(
    screen.getByRole("heading", { level: 1, name: /Easy Finder AI/i })
  ).toBeInTheDocument();

  const demoLinks = screen.getAllByRole("link", { name: /^demo$/i });
  expect(demoLinks.length).toBeGreaterThan(0);
  demoLinks.forEach((link) => {
    expect(link).toHaveAttribute("href", "/demo");
  });
});
