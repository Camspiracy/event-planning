// src/tests/plannerTests/PlannerEvents.test.jsx
import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, beforeEach, vi, expect } from "vitest";
import PlannerAllEvents from "../../pages/planner/PlannerAllEvents";

// --- Mock Firebase Auth ---
vi.mock("firebase/auth", () => ({
  getAuth: () => ({
    currentUser: {
      getIdToken: vi.fn(() => Promise.resolve("fake-token")),
    },
  }),
}));

// --- Helper render wrapper ---
const renderWithRouter = (ui) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
};

// --- Test Data ---
const mockEvents = [
  {
    id: "1",
    name: "Conference",
    status: "upcoming",
    date: "2025-10-01T12:00:00Z",
    location: "Cape Town",
    expectedGuestCount: 200,
    budget: 10000,
    description: "Tech conference",
  },
  {
    id: "2",
    name: "Wedding",
    status: "completed",
    date: "2025-01-01T12:00:00Z",
    location: "Johannesburg",
    expectedGuestCount: 100,
    budget: 5000,
    description: "Big wedding event",
  },
  {
    id: "3",
    name: "Birthday Party",
    status: "in-progress",
    date: "2025-09-01T12:00:00Z",
    location: "Durban",
    expectedGuestCount: 50,
    budget: 2000,
    description: "Birthday fun",
  },
];

describe("PlannerAllEvents", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ events: mockEvents }),
      })
    );
  });

  it("renders header and controls", async () => {
    renderWithRouter(<PlannerAllEvents onSelectEvent={vi.fn()} />);

    expect(await screen.findByRole("heading", { name: /My Events/i })).toBeInTheDocument();
    expect(screen.getByText(/Manage and track all your events/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /\+ New Event/i })).toBeInTheDocument();
  });

  it("renders all initial events", async () => {
    renderWithRouter(<PlannerAllEvents onSelectEvent={vi.fn()} />);

    expect(await screen.findByRole("heading", { name: /Conference/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Wedding/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Birthday Party/i })).toBeInTheDocument();
  });

  it("filters events by status", async () => {
    renderWithRouter(<PlannerAllEvents onSelectEvent={vi.fn()} />);

    await screen.findByRole("heading", { name: /Conference/i });

    fireEvent.click(screen.getByRole("button", { name: /Upcoming/i }));

    expect(screen.getByRole("heading", { name: /Conference/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Wedding/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Birthday Party/i })).not.toBeInTheDocument();
  });

  it("searches events by name", async () => {
    renderWithRouter(<PlannerAllEvents onSelectEvent={vi.fn()} />);

    await screen.findByRole("heading", { name: /Conference/i });

    fireEvent.change(screen.getByPlaceholderText(/Search events/i), {
      target: { value: "Wedding" },
    });

    expect(screen.getByRole("heading", { name: /Wedding/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Conference/i })).not.toBeInTheDocument();
  });

  it("sorts events by name", async () => {
    renderWithRouter(<PlannerAllEvents onSelectEvent={vi.fn()} />);

    await screen.findByRole("heading", { name: /Conference/i });

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "name" } });

    const headings = screen.getAllByRole("heading", { level: 3 });
    const names = headings.map((h) => h.textContent);

    expect(names).toEqual(["Birthday Party", "Conference", "Wedding"]);
  });

  
  it("shows no events message when none match", async () => {
    renderWithRouter(<PlannerAllEvents onSelectEvent={vi.fn()} />);

    await screen.findByRole("heading", { name: /Conference/i });

    fireEvent.change(screen.getByPlaceholderText(/Search events/i), {
      target: { value: "Nonexistent" },
    });

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: /Conference/i })).not.toBeInTheDocument();
    });

    expect(screen.getByText(/No events found/i)).toBeInTheDocument();
  });
});
