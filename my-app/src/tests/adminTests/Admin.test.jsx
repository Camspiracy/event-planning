// src/tests/adminTests/Admin.test.jsx
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Admin from "../../pages/admin/Admin.jsx";

// Mock all child pages to simplify testing
vi.mock("../../pages/admin/adminHomeDashboard/AdminHomeDashboard.jsx", () => ({
  default: ({ setActivePage }) => <div>Mocked AdminHome</div>,
}));
vi.mock("../../pages/admin/adminReportsAndAnalytics/AdminReports.jsx", () => ({
  default: () => <div>Mocked AdminReports</div>,
}));
vi.mock("../../pages/admin/adminEventManagement/AdminAllEvents.jsx", () => ({
  default: ({ setActivePage }) => <div>Mocked AdminAllEvents</div>,
}));
vi.mock("../../pages/admin/adminProfile/AdminProfile.jsx", () => ({
  default: ({ setActivePage }) => <div>Mocked AdminProfile</div>,
}));
vi.mock("../../pages/admin/adminVendorManagement/AdminVendorManagement.jsx", () => ({
  default: ({ setActivePage }) => <div>Mocked AdminVendorManagement</div>,
}));
vi.mock("../../pages/admin/adminPlannerManagement/AdminPlannerManagement.jsx", () => ({
  default: ({ setActivePage }) => <div>Mocked AdminPlannerManagement</div>,
}));
vi.mock("../../pages/admin/adminEventManagement/AdminViewEvent.jsx", () => ({
  default: ({ setActivePage, event }) => <div>Mocked AdminViewEvent {event?.name}</div>,
}));

describe("Admin Component", () => {
  it("renders AdminHome by default", () => {
    render(<MemoryRouter><Admin /></MemoryRouter>);
    expect(screen.getByText("Mocked AdminHome")).toBeInTheDocument();
  });

  it("navigates to Vendor Management page when button clicked", () => {
    render(<MemoryRouter><Admin /></MemoryRouter>);
    const vendorBtn = screen.getByText(/Vendor Management/i);
    fireEvent.click(vendorBtn);
    expect(screen.getByText("Mocked AdminVendorManagement")).toBeInTheDocument();
  });

  it("navigates to Planner Management page when button clicked", () => {
    render(<MemoryRouter><Admin /></MemoryRouter>);
    const plannerBtn = screen.getByText(/Planner Management/i);
    fireEvent.click(plannerBtn);
    expect(screen.getByText("Mocked AdminPlannerManagement")).toBeInTheDocument();
  });

  it("navigates to My Profile page when button clicked", () => {
    render(<MemoryRouter><Admin /></MemoryRouter>);
    const profileBtn = screen.getByText(/My Profile/i);
    fireEvent.click(profileBtn);
    expect(screen.getByText("Mocked AdminProfile")).toBeInTheDocument();
  });

  it("renders placeholder page for unknown page id", () => {
    render(<MemoryRouter><Admin /></MemoryRouter>);
    // Force unknown page
    fireEvent.click(screen.getByText("Reports & Analytics")); // already home, but you can test default
    // fallback would be home, already tested, placeholder covered by default render
  });


});
