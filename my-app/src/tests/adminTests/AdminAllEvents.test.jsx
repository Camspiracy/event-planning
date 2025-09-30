import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, beforeEach, vi, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AdminAllEvents from "../../pages/admin/adminEventManagement/AdminAllEvents.jsx";
beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ events: [] }),
    })
  );
});

// --- Mock firebase/auth ---
vi.mock("firebase/auth", () => {
  const mockAuth = {
    currentUser: {
      uid: "test-admin",
      getIdToken: vi.fn(() => Promise.resolve("mock-token")),
    },
  };
  return { getAuth: () => mockAuth };
});

// --- Global mocks ---
global.fetch = vi.fn();
global.confirm = vi.fn(() => true);

describe("AdminAllEvents", () => {
  const setActivePage = vi.fn();
  const setSelectedEvent = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state", () => {
    render(
      <MemoryRouter>
        <AdminAllEvents setActivePage={setActivePage} setSelectedEvent={setSelectedEvent} />
      </MemoryRouter>
    );
    expect(screen.getByText(/Loading events.../i)).toBeInTheDocument();
  });

  it("shows no events message when API returns empty", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ events: [] }),
    });

    render(
      <MemoryRouter>
        <AdminAllEvents setActivePage={setActivePage} setSelectedEvent={setSelectedEvent} />
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(screen.getByText(/No events found matching your criteria/i)).toBeInTheDocument()
    );
  });

 

  it("calls setActivePage and setSelectedEvent on Quick View", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        events: [
          {
            id: "1",
            name: "Wedding",
            date: "2025-10-01",
            location: "Cape Town",
            expectedGuestCount: 100,
            budget: 20000,
            status: "upcoming",
            description: "Big day event",
          },
        ],
      }),
    });

    render(
      <MemoryRouter>
        <AdminAllEvents setActivePage={setActivePage} setSelectedEvent={setSelectedEvent} />
      </MemoryRouter>
    );

    await waitFor(() => screen.getByText("Quick View"));
    fireEvent.click(screen.getByText("Quick View"));

    expect(setSelectedEvent).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Wedding" })
    );
    expect(setActivePage).toHaveBeenCalledWith("AdminViewEvent");
  });

  it("deletes event when delete button is clicked", async () => {
    // Initial fetch for events
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          events: [
            {
              id: "1",
              name: "Wedding",
              date: "2025-10-01",
              location: "Cape Town",
              expectedGuestCount: 100,
              budget: 20000,
              status: "upcoming",
              description: "Big day event",
            },
          ],
        }),
      })
      // DELETE call
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    render(
      <MemoryRouter>
        <AdminAllEvents setActivePage={setActivePage} setSelectedEvent={setSelectedEvent} />
      </MemoryRouter>
    );

    await waitFor(() => screen.getByText("Wedding"));

    fireEvent.click(screen.getByText("Delete"));

    await waitFor(() => {
      expect(screen.queryByText("Wedding")).not.toBeInTheDocument();
    });
  });
});
