import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, vi, expect } from "vitest";
import Popup from "../../pages/admin/adminGeneralComponents/Popup.jsx"; // adjust path

describe("Popup", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    onClose.mockClear();
  });

  it("does not render when isOpen is false", () => {
    render(<Popup isOpen={false} onClose={onClose}>Hello</Popup>);
    expect(screen.queryByText("Hello")).not.toBeInTheDocument();
  });

  it("renders children when isOpen is true", () => {
    render(<Popup isOpen={true} onClose={onClose}>Hello</Popup>);
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("Close")).toBeInTheDocument();
  });

  it("calls onClose when overlay is clicked", () => {
  render(<Popup isOpen={true} onClose={onClose}>Hello</Popup>);

  // Select the overlay div directly
  const overlay = screen.getByRole("presentation", { hidden: true }) || 
                  document.querySelector(".popup-overlay");

  fireEvent.click(overlay);

  expect(onClose).toHaveBeenCalled();
});


  it("calls onClose when close button is clicked", () => {
    render(<Popup isOpen={true} onClose={onClose}>Hello</Popup>);
    fireEvent.click(screen.getByText("Close"));
    expect(onClose).toHaveBeenCalled();
  });

  it("does not call onClose when clicking inside content", () => {
    render(<Popup isOpen={true} onClose={onClose}>Hello</Popup>);
    fireEvent.click(screen.getByText("Hello"));
    expect(onClose).not.toHaveBeenCalled();
  });
});
