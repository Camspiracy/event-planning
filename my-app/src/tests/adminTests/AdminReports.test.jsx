import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, beforeEach, vi, expect } from "vitest";
import AdminReports from "../../pages/admin/adminReportsAndAnalytics/AdminReports";
// src/setupTests.js or at top of your test file
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

// --- Mock firebase auth ---
let currentUser = { getIdToken: vi.fn(() => Promise.resolve("mock-token")) };
vi.mock("../../../firebase", () => ({
  auth: {
    currentUser,
  },
}));

// --- Global fetch mock ---
global.fetch = vi.fn();
global.console = { error: vi.fn() };

describe("AdminReports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUser = { getIdToken: vi.fn(() => Promise.resolve("mock-token")) };
  });

  it("shows loading initially", () => {
    render(<AdminReports />);
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
  });

  

  it("renders KPI cards and allows expanding popups for all sections", async () => {
    const mockSummary = {
      totals: { events: 10, planners: 5, vendors: 3, guests: 50, services: 7 },
      eventInsights: {
        guestStats: { avgGuestsPerEvent: 5 },
        budget: { avgBudgetPerEvent: 1000, totalBudget: 5000, totalNegotiatedSpend: 3500, avgSpendPerEvent: 700 },
        categoryPopularity: [{ category: "Music", count: 5 }],
      },
      plannerInsights: { avgEventsPerPlanner: 2 },
      vendorInsights: { vendorServiceRatio: 0.6, popularCategories: [{ category: "Catering", count: 3 }] },
    };

    const mockEvents = { events: [{ date: "2025-09-01", budget: 100 }] };

    global.fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockSummary) }) // summary
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockEvents) }); // events

    render(<AdminReports />);

    // Wait for KPI cards
    await waitFor(() => screen.getByText("Total Events"));

    // Expand each section popup
    const sections = [
      { label: /Expand Event Reports/i, title: /Detailed Events Analytics/i },
      { label: /Expand Planner Reports/i, title: /Detailed Planners Analytics/i },
      { label: /Expand Vendor Reports/i, title: /Detailed Vendors Analytics/i },
      { label: /Expand Financial Reports/i, title: /Detailed Financial Analytics/i },
    ];

    for (const sec of sections) {
      fireEvent.click(screen.getByText(sec.label));
      await waitFor(() =>
        expect(screen.getByText(sec.title)).toBeInTheDocument()
      );
      // Close popup
      fireEvent.click(screen.getByRole("button", { name: /close/i }));
    }
  });

  
});
