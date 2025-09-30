// src/tests/vendorTests/vendorApply.render.test.jsx
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, vi } from "vitest";
import VendorApply from "../../pages/vendor/vendorApply";
import { useNavigate } from "react-router-dom";

// --- Mock useNavigate ---
vi.mock("react-router-dom", () => ({
  useNavigate: vi.fn(),
}));

describe("VendorApply Rendering", () => {
 

  it("renders all input fields", () => {
    render(<VendorApply />);
    expect(screen.getByLabelText(/Business Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Address \(optional\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Profile Picture/i)).toBeInTheDocument();
  });

  it("renders category options in datalist", () => {
    render(<VendorApply />);
    const datalist = screen.getByRole("listbox", { hidden: true }) || screen.getByTestId("vendor-categories");
    expect(datalist).toBeInTheDocument();
  });

  it("renders the submit button", () => {
    render(<VendorApply />);
    expect(screen.getByRole("button", { name: /Submit Application/i })).toBeInTheDocument();
  });
});
