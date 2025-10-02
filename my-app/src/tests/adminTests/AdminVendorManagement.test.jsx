import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, beforeEach, vi, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AdminVendorManagement from "../../pages/admin/adminVendorManagement/AdminVendorManagement.jsx";

// Mock firebase/auth
vi.mock("firebase/auth", () => ({
  getAuth: () => ({
    currentUser: {
      uid: "test-admin",
      getIdToken: vi.fn(() => Promise.resolve("mock-token")),
    },
  }),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock Popup so it renders children directly
vi.mock("../adminGeneralComponents/Popup.jsx", () => {
  return ({ isOpen, children }) => (isOpen ? <div>{children}</div> : null);
});

beforeEach(() => {
  vi.clearAllMocks();
});

const mockVendors = [
  {
    id: "v1",
    businessName: "Vendor One",
    category: "Food",
    description: "Best food",
    email: "v1@test.com",
    phone: "123",
    address: "Addr 1",
    profilePic: "",
  },
  {
    id: "v2",
    businessName: "Vendor Two",
    category: "Clothing",
    description: "Best clothes",
    email: "v2@test.com",
    phone: "456",
    address: "Addr 2",
    profilePic: "",
  },
];

describe("AdminVendorManagement", () => {
  it("renders loading then vendors", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(mockVendors) })
    );

    render(
      <MemoryRouter>
        <AdminVendorManagement />
      </MemoryRouter>
    );
    expect(screen.getByText(/Loading Vendors/i)).toBeInTheDocument();
    // Wait for vendors to appear
    expect(await screen.findByText("Vendor One")).toBeInTheDocument();
  });
  it("filters vendors by search", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(mockVendors) })
    );
    render(
      <MemoryRouter>
        <AdminVendorManagement />
      </MemoryRouter>
    );
    await screen.findByText("Vendor One");
    const input = screen.getByPlaceholderText(/Search by business name/i);
    fireEvent.change(input, { target: { value: "Two" } });

    const vendorCards = screen.getAllByRole("article"); // your vendor-summary-card elements
expect(vendorCards[0]).not.toHaveTextContent("Vendor One"); // should only have "Vendor Two"
expect(vendorCards[0]).toHaveTextContent("Vendor Two");

  });

  it("opens popup with vendor details", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(mockVendors) })
    );

    render(
      <MemoryRouter>
        <AdminVendorManagement />
      </MemoryRouter>
    );

    await screen.findByText("Vendor One");

    const viewButtons = screen.getAllByText(/View Details/i);
fireEvent.click(viewButtons[0]); 

expect(screen.getByText("Best food")).toBeInTheDocument();
  });
});
