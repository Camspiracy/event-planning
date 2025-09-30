// src/tests/plannerTests/InformationToolTip.test.jsx
/**
 * @vitest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import InformationToolTip from "../../pages/planner/InformationToolTip.jsx";

// Mock Lucide React icon
vi.mock("lucide-react", () => ({
  Info: vi.fn(({ size, style }) => (
    <div data-testid="info-icon" data-size={size} style={style}>
      Info Icon
    </div>
  )),
}));

describe("HoverPopup", () => {
  const defaultProps = {
    children: <button>Hover me</button>,
    content: "This is a helpful tooltip",
  };

  it("renders children correctly", () => {
    render(<InformationToolTip {...defaultProps} />);
    
    expect(screen.getByText("Hover me")).toBeInTheDocument();
  });

  it("does not show popup initially", () => {
    render(<InformationToolTip {...defaultProps} />);
    
    expect(screen.queryByText("This is a helpful tooltip")).not.toBeInTheDocument();
  });

  it("shows popup on mouse enter and hides on mouse leave", () => {
    render(<InformationToolTip {...defaultProps} />);

    // Trigger mouse enter
    fireEvent.mouseEnter(screen.getByText("Hover me"));
    
    // Popup should be visible
    expect(screen.getByText("This is a helpful tooltip")).toBeInTheDocument();
    expect(screen.getByTestId("info-icon")).toBeInTheDocument();

    // Trigger mouse leave
    fireEvent.mouseLeave(screen.getByText("Hover me"));
    
    // Popup should be hidden
    expect(screen.queryByText("This is a helpful tooltip")).not.toBeInTheDocument();
  });

  it("renders Info icon with correct props", () => {
    render(<InformationToolTip {...defaultProps} />);
    
    fireEvent.mouseEnter(screen.getByText("Hover me"));
    
    const infoIcon = screen.getByTestId("info-icon");
    expect(infoIcon).toHaveAttribute('data-size', '18');
    expect(infoIcon).toHaveStyle('color: #0066cc');
  });

  it("applies custom positioning props", () => {
    const customProps = {
      ...defaultProps,
      top: "120%",
      left: "30%",
      minWidth: "300px"
    };

    render(<InformationToolTip {...customProps} />);
    
    fireEvent.mouseEnter(screen.getByText("Hover me"));
    
    const popup = screen.getByText("This is a helpful tooltip").parentElement;
    
    expect(popup).toHaveStyle({
      top: "120%",
      left: "30%",
      minWidth: "300px",
      transform: "translateX(-50%)"
    });
  });

  it("renders with default positioning when no props provided", () => {
    render(<InformationToolTip {...defaultProps} />);
    
    fireEvent.mouseEnter(screen.getByText("Hover me"));
    
    const popup = screen.getByText("This is a helpful tooltip").parentElement;
    
    expect(popup).toHaveStyle({
      top: "110%",
      left: "50%",
      minWidth: "220px"
    });
  });

  it("applies correct styling to popup", () => {
    render(<InformationToolTip {...defaultProps} />);
    
    fireEvent.mouseEnter(screen.getByText("Hover me"));
    
    const popup = screen.getByText("This is a helpful tooltip").parentElement;
    
    expect(popup).toHaveStyle({
      backgroundColor: "#e8f4ff",
      border: "1px solid #b3daff",
      color: "#003366",
      borderRadius: "8px",
      padding: "10px 14px",
      boxShadow: "0px 4px 12px rgba(0,0,0,0.15)",
      zIndex: "100"
    });
  });

  it("handles complex children components", () => {
    const complexChildren = (
      <div data-testid="complex-child">
        <span>Complex content</span>
        <input type="text" placeholder="Enter text" />
      </div>
    );

    render(
      <InformationToolTip content="Tooltip for complex children">
        {complexChildren}
      </InformationToolTip>
    );

    expect(screen.getByTestId("complex-child")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByTestId("complex-child"));
    expect(screen.getByText("Tooltip for complex children")).toBeInTheDocument();
  });

  it("renders popup content with flex layout", () => {
    render(<InformationToolTip {...defaultProps} />);
    
    fireEvent.mouseEnter(screen.getByText("Hover me"));
    
    const popup = screen.getByText("This is a helpful tooltip").parentElement;
    
    expect(popup).toHaveStyle({
      display: "flex",
      alignItems: "flex-start",
      gap: "8px"
    });
  });

  it("maintains popup visibility during hover interactions", () => {
    render(<InformationToolTip {...defaultProps} />);
    
    const trigger = screen.getByText("Hover me");
    
    // Enter and verify popup stays visible
    fireEvent.mouseEnter(trigger);
    expect(screen.getByText("This is a helpful tooltip")).toBeInTheDocument();
    
    // Quick enter/leave/enter should maintain state
    fireEvent.mouseLeave(trigger);
    fireEvent.mouseEnter(trigger);
    expect(screen.getByText("This is a helpful tooltip")).toBeInTheDocument();
  });
});