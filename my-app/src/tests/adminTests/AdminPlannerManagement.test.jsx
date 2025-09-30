import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, vi, beforeEach, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";
import PlannerManagement from "../../pages/admin/adminPlannerManagement/AdminPlannerManagement.jsx";

const mockPlanners = [
  { id: "p1", name: "Planner One", status: "active", email: "one@test.com", phone: "123", activeEvents: 2 },
  { id: "p2", name: "Planner Two", status: "suspended", email: "two@test.com", phone: "456", activeEvents: 0 },
];


vi.mock("firebase/auth", () => ({
  getAuth: () => ({
    currentUser: {
      uid: "admin1",
      getIdToken: vi.fn(() => Promise.resolve("mock-token")),
    },
  }),
}));


vi.mock("../../pages/admin/adminGeneralComponents/Popup.jsx", () => ({
  default: ({ isOpen, children }) => 
    isOpen ? (
      <div data-testid="popup" className="popup-content">
        {children}
      </div>
    ) : null
}));

describe("PlannerManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockPlanners) 
      })
    );
  });

  it("renders loading state initially", () => {
    render(
      <MemoryRouter>
        <PlannerManagement />
      </MemoryRouter>
    );
    expect(screen.getByText(/Loading Planners/i)).toBeInTheDocument();
  });

  it("renders fetched planners", async () => {
    const { container } = render(
      <MemoryRouter>
        <PlannerManagement />
      </MemoryRouter>
    );

    await waitFor(() => {
      const plannerCards = container.querySelectorAll(".planner-summary-card"); // Updated class name
      expect(plannerCards.length).toBe(2);
      
      
      const plannerNames = screen.getAllByRole('heading', { level: 4 });
      expect(plannerNames[0]).toHaveTextContent("Planner One");
      expect(plannerNames[1]).toHaveTextContent("Planner Two");
    });
  });

  it("filters planners by search term", async () => {
    render(
      <MemoryRouter>
        <PlannerManagement />
      </MemoryRouter>
    );

   
    await waitFor(() => {
      const plannerNames = screen.getAllByRole('heading', { level: 4 });
      expect(plannerNames[0]).toHaveTextContent("Planner One");
    });

   
    fireEvent.change(screen.getByPlaceholderText(/Search by planner name/i), {
      target: { value: "Two" }
    });

 
    await waitFor(() => {
      const plannerCards = screen.getAllByRole('heading', { level: 4 });
      expect(plannerCards).toHaveLength(1);
      expect(plannerCards[0]).toHaveTextContent("Planner Two");
    });
  });

 it("opens popup when 'View Details' clicked", async () => {
  render(
    <MemoryRouter>
      <PlannerManagement />
    </MemoryRouter>
  );

  await waitFor(() => {
    expect(screen.getByText("Planner One")).toBeInTheDocument();
  });

 
  const cards = screen.getAllByRole("article");
  const firstCard = cards[0];
  fireEvent.click(within(firstCard).getByText("View Details"));

  
  await waitFor(() => {
    const popup = screen.getByTestId("popup");
    expect(popup).toBeInTheDocument();

   
    expect(within(popup).getByText("Planner One")).toBeInTheDocument();
    expect(within(popup).getByText(/one@test.com/)).toBeInTheDocument();

    
    const activeMatches = within(popup).getAllByText(/active/i);
    expect(activeMatches.length).toBeGreaterThan(0);
  });
});


  it("shows 'No planners found' when API returns empty", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(
      <MemoryRouter>
        <PlannerManagement />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/No planners found/i)).toBeInTheDocument();
    });
  });
});

   