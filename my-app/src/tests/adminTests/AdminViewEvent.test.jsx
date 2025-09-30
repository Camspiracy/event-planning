import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, beforeEach, vi, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AdminViewEvent from "../../pages/admin/adminEventManagement/AdminViewEvent.jsx";
import { getAuth } from "firebase/auth";

vi.mock("firebase/auth", () => {
  const mockAuth = {
    currentUser: {
      uid: "test-admin",
      getIdToken: vi.fn(() => Promise.resolve("mock-token")),
    },
  };
  return { getAuth: () => mockAuth };
});

global.fetch = vi.fn();


describe("AdminViewEvent", () => {
  const setActivePage = vi.fn();
  const event = {
    id: "1",
    name: "Wedding",
    date: "2025-10-01",
    location: "Cape Town",
    description: "Big day event",
    expectedGuestCount: 100,
    budget: 20000,
    status: "upcoming",
    tasks: { "Book venue": true, "Send invites": false },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ guests: [], vendors: [], services: [] }),
    });
  });

  it("renders loading state if no event", () => {
    render(
      <MemoryRouter>
        <AdminViewEvent event={null} setActivePage={setActivePage} />
      </MemoryRouter>
    );
    expect(screen.getByText(/Loading event/i)).toBeInTheDocument();
  });

  it("renders event details tab by default", () => {
    render(
      <MemoryRouter>
        <AdminViewEvent event={event} setActivePage={setActivePage} />
      </MemoryRouter>
    );

    expect(screen.getByText(/Date:/i)).toBeInTheDocument();
    expect(screen.getByText(/Location:/i)).toBeInTheDocument();
    expect(screen.getByText(/Description:/i)).toBeInTheDocument();
    expect(screen.getByText(/Expected Guests:/i)).toBeInTheDocument();
    expect(screen.getByText(/Budget:/i)).toBeInTheDocument();
    expect(screen.getByText(/Status:/i)).toBeInTheDocument();
  });

  it("switches to guests tab and shows RSVP summary", async () => {
    const mockGuests = [
      { id: "g1", firstname: "John", lastname: "Doe", email: "john@test.com", plusOne: 1, rsvpStatus: "accept" },
      { id: "g2", firstname: "Jane", lastname: "Smith", email: "jane@test.com", plusOne: 0, rsvpStatus: "pending" },
    ];
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ guests: mockGuests }),
    });

    render(
      <MemoryRouter>
        <AdminViewEvent event={event} setActivePage={setActivePage} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText("Guests"));

   await waitFor(() => {
  const confirmed = screen.getByText("Confirmed").previousSibling; 
  const pending = screen.getByText("Pending").previousSibling;

  expect(confirmed.textContent).toBe("1");
  expect(pending.textContent).toBe("1");
  expect(screen.getByText("John Doe")).toBeInTheDocument();
  expect(screen.getByText("Jane Smith")).toBeInTheDocument();
});

  });

  it("switches to vendors tab and shows vendors and services", async () => {
  const mockVendors = [
    { id: "v1", businessName: "Floral Co", category: "Flowers", cost: 5000 },
  ];
  const mockServices = [
    { id: "s1", serviceName: "Photography", vendorName: "PhotoPro", estimatedCost: 10000 },
  ];


  global.fetch.mockImplementation((url) => {
    if (url.includes('/vendors')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ vendors: mockVendors })
      });
    }
    if (url.includes('/services')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ services: mockServices })
      });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({})
    });
  });

  render(
    <MemoryRouter>
      <AdminViewEvent event={event} setActivePage={setActivePage} />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByText("Vendors"));

  await waitFor(() => {
    // Vendor name
    const vendorNames = screen.getAllByText((content, element) =>
      element.textContent.includes('Floral Co')
    );
    expect(vendorNames[0]).toBeInTheDocument();

    // Vendor category
    const categories = screen.getAllByText((content, element) =>
      element.textContent.includes('Flowers')
    );
    expect(categories[0]).toBeInTheDocument();

    // Vendor cost
    const costs = screen.getAllByText((content, element) =>
      element.textContent.includes('5000')
    );
    expect(costs[0]).toBeInTheDocument();

    // Service
    const services = screen.getAllByText((content, element) =>
      element.textContent.includes('Photography') && element.textContent.includes('PhotoPro')
    );
    expect(services[0]).toBeInTheDocument();
  });
});


  it("switches to tasks tab and shows tasks with checkboxes", () => {
    render(
      <MemoryRouter>
        <AdminViewEvent event={event} setActivePage={setActivePage} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText("Tasks"));

    expect(screen.getByText("Book venue")).toBeInTheDocument();
    expect(screen.getByText("Send invites")).toBeInTheDocument();

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[0]).toBeChecked(); 
    expect(checkboxes[1]).not.toBeChecked(); 
  });

  it("calls setActivePage when back button clicked", () => {
    render(
      <MemoryRouter>
        <AdminViewEvent event={event} setActivePage={setActivePage} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText("← Back"));
    expect(setActivePage).toHaveBeenCalledWith("event-management");
  });
});
