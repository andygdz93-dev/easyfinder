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
  expect(screen.getByRole("link", { name: /^demo$/i })).toHaveAttribute("href", "/demo");
});
