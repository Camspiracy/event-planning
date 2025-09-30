import { render, screen } from "@testing-library/react";
import App from "../App"; // adjust path

describe("App Rendering", () => {
  it("renders App without crashing", () => {
    render(<App />);
  });
});
