import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, vi, expect } from "vitest";
import AdminHomeDashboard from "../../pages/admin/adminHomeDashboard/AdminHomeDashboard.jsx";

vi.mock("../../pages/admin/adminReportsAndAnalytics/AdminReports.jsx", () => ({
  default: () => <div>AdminReports Component</div>,
}));

describe("AdminHomeDashboard", () => {
  it("renders AdminReports component", () => {
    render(<AdminHomeDashboard />);
    expect(screen.getByText((text) => text.includes("AdminReports Component"))).toBeInTheDocument();
  });
});