import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders EasyFinder", () => {
  render(<App />);
  expect(screen.getByText("EasyFinder")).toBeInTheDocument();
});
