import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, beforeEach, beforeAll, afterEach, vi, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";

beforeEach(() => {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
    })
  );
  global.alert.mockClear();
  mockAuth.currentUser.getIdToken.mockClear();
});

beforeEach(() => {
  mockNavigate.mockClear();
  mockAuth.currentUser.getIdToken.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

// Mock Firebase auth
const mockAuth = {
  currentUser: {
    uid: "test-planner",
    getIdToken: vi.fn(() => Promise.resolve("mock-token")),
  },
};

vi.mock("firebase/auth", () => ({
  getAuth: () => mockAuth,
  onAuthStateChanged: vi.fn((auth, callback) => {
    callback(mockAuth.currentUser);
    return vi.fn(); // unsubscribe function
  }),
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock date-fns
vi.mock("date-fns", () => ({
  isAfter: vi.fn((date, comparison) => {
    const testDate = new Date(date);
    const compDate = new Date(comparison);
    return testDate > compDate;
  }),
  isBefore: vi.fn((date, comparison) => {
    const testDate = new Date(date);
    const compDate = new Date(comparison);
    return testDate < compDate;
  }),
}));

// Mock Lucide icons
vi.mock("lucide-react", () => ({
  Calendar: () => <div data-testid="calendar-icon">Calendar</div>,
  Users: () => <div data-testid="users-icon">Users</div>,
  Plus: () => <div data-testid="plus-icon">Plus</div>,
  BarChart3: () => <div data-testid="chart-icon">Chart</div>,
  MapPin: () => <div data-testid="map-icon">MapPin</div>,
  FileText: () => <div data-testid="file-icon">FileText</div>,
  Store: () => <div data-testid="store-icon">Store</div>,
  CalendarDays: () => <div data-testid="calendar-days-icon">CalendarDays</div>,
  Building: () => <div data-testid="building-icon">Building</div>,
}));

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = function() {};
});



import PlannerDashboard from "../../pages/planner/PlannerDashboard";

const mockEvents = [
  {
    id: "event1",
    name: "Tech Conference 2024",
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    location: "Convention Center",
    expectedGuestCount: 300,
    budget: 50000,
    description: "Annual technology conference",
    status: "upcoming"
  },
  {
    id: "event2", 
    name: "Marketing Workshop",
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
    location: "Business Hub",
    expectedGuestCount: 50,
    budget: 10000,
    description: "Digital marketing strategies workshop",
    status: "in-progress"
  },
  {
    id: "event3",
    name: "Company Retreat",
    date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days from now (outside 30-day window)
    location: "Mountain Lodge",
    expectedGuestCount: 100,
    budget: 25000,
    description: "Annual company retreat",
    status: "upcoming"
  },
  {
    id: "event4",
    name: "Product Launch",
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    location: "Showroom",
    expectedGuestCount: 200,
    budget: 75000,
    description: "New product launch event",
    status: "completed"
  }
];

describe("PlannerDashboard", () => {
  beforeEach(() => {
    global.fetch.mockClear();
    mockNavigate.mockClear();
  });

  it("shows loading state when auth is undefined", () => {
    // Mock onAuthStateChanged to not call callback immediately
    const { unmount } = render(
      <MemoryRouter>
        <PlannerDashboard />
      </MemoryRouter>
    );
    
    // Component should render without crashing during loading
    expect(screen.getByText("Planner Dashboard")).toBeInTheDocument();
    unmount();
  });

  it("renders dashboard with no events when user has no events", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ events: [] }),
    });

    render(
      <MemoryRouter>
        <PlannerDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Planner Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Welcome back, here's what's happening with your events.")).toBeInTheDocument();
    });

    // Check that no events message is displayed
    expect(screen.getByText("You have no upcoming events")).toBeInTheDocument();
  });

  it("fetches and displays events when user is authenticated", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ events: mockEvents }),
    });

    render(
      <MemoryRouter>
        <PlannerDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "https://us-central1-planit-sdp.cloudfunctions.net/api/planner/me/events",
        expect.objectContaining({
          headers: {
            Authorization: "Bearer mock-token",
          },
        })
      );
    });

    // Should show upcoming events within 30 days
    expect(screen.getByText("Tech Conference 2024")).toBeInTheDocument();
    expect(screen.getByRole("heading", {name: "Marketing Workshop"})).toBeInTheDocument();
    // Should NOT show event outside 30-day window or past events in upcoming section
    expect(screen.queryByText("Company Retreat")).not.toBeInTheDocument();
    expect(screen.queryByText("Product Launch")).not.toBeInTheDocument();
  });

  it("calculates and displays correct summary statistics", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ events: mockEvents }),
    });

    render(
      <MemoryRouter>
        <PlannerDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Upcoming events count (within 30 days)
      expect(screen.getByText("2")).toBeInTheDocument(); // Tech Conference + Marketing Workshop
      
      // Average attendance calculation
      // Total guests across all events: 300 + 50 + 100 + 200 = 650
      // Average: 650 / 4 = 162.5 → 163 (rounded)
      expect(screen.getByText("163")).toBeInTheDocument();
    });
  });

  it("navigates to new event page when New Event button is clicked", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ events: [] }),
    });

    render(
      <MemoryRouter>
        <PlannerDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      const newEventButton = screen.getByText("New Event");
      fireEvent.click(newEventButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith("/planner/new-event");
  });

  it("navigates to events page when View All events is clicked", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ events: [] }),
    });

    render(
      <MemoryRouter>
        <PlannerDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      const viewAllButton = screen.getByTestId("view-all");
      fireEvent.click(viewAllButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith("/planner/events");
  });

  it("navigates to vendor page when View All vendors is clicked", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ events: [] }),
    });

    render(
      <MemoryRouter>
        <PlannerDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      const vendorViewAllButtons = screen.getAllByText("View All");
      // The second View All button is for vendors
      fireEvent.click(vendorViewAllButtons[1]);
    });

    expect(mockNavigate).toHaveBeenCalledWith("/planner/vendor");
  });

  it("calls onSelectEvent when Select Event button is clicked", async () => {
    const mockOnSelectEvent = vi.fn();
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ events: [mockEvents[0]] }),
    });

    render(
      <MemoryRouter>
        <PlannerDashboard onSelectEvent={mockOnSelectEvent} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Tech Conference 2024")).toBeInTheDocument();
    });

    const selectButton = screen.getByText("Select Event");
    fireEvent.click(selectButton);

    expect(mockOnSelectEvent).toHaveBeenCalledWith(mockEvents[0]);
  });

  it("handles API errors gracefully", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(
      <MemoryRouter>
        <PlannerDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Should still render the dashboard but with no events
      expect(screen.getByText("Planner Dashboard")).toBeInTheDocument();
      expect(screen.getByText("You have no upcoming events")).toBeInTheDocument();
    });
  });

  it("displays quick action buttons and navigates correctly", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ events: [] }),
    });

    render(
      <MemoryRouter>
        <PlannerDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Check all quick action buttons are present
      expect(screen.getByText("Browse Vendors")).toBeInTheDocument();
      expect(screen.getByText("Manage Guests")).toBeInTheDocument();
      expect(screen.getByText("All Events")).toBeInTheDocument();
      expect(screen.getByText("All Vendors")).toBeInTheDocument();
    });

    // Test navigation for quick actions
    const browseVendorsButton = screen.getByText("Browse Vendors");
    fireEvent.click(browseVendorsButton);
    expect(mockNavigate).toHaveBeenCalledWith("/planner/vendor");

    const manageGuestsButton = screen.getByText("Manage Guests");
    fireEvent.click(manageGuestsButton);
    expect(mockNavigate).toHaveBeenCalledWith("/planner/guest-management");

    const allEventsButton = screen.getByText("All Events");
    fireEvent.click(allEventsButton);
    expect(mockNavigate).toHaveBeenCalledWith("/planner/events");

    const allVendorsButton = screen.getByText("All Vendors");
    fireEvent.click(allVendorsButton);
    expect(mockNavigate).toHaveBeenCalledWith("/planner/vendor");
  });

  it("displays vendor information correctly", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ events: [] }),
    });

    render(
      <MemoryRouter>
        <PlannerDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Check vendor data is displayed
      expect(screen.getByText("ABC Catering")).toBeInTheDocument();
      expect(screen.getByText("SoundWorks")).toBeInTheDocument();
      expect(screen.getByText("VenueCo")).toBeInTheDocument();
      
      // Check vendor status badges
      expect(screen.getByText("Pending")).toBeInTheDocument();
    });
  });

  it("calculates percentage changes correctly", async () => {
    // Create events with specific guest counts for accurate percentage calculation
    const testEvents = [
      {
        id: "event1",
        name: "Future Event",
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        location: "Test Venue",
        expectedGuestCount: 100, // This will be in upcoming
        budget: 10000,
        description: "Test event",
        status: "upcoming"
      },
      {
        id: "event2",
        name: "Past Event", 
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        location: "Test Venue",
        expectedGuestCount: 50, // This will be in past
        budget: 5000,
        description: "Past test event",
        status: "completed"
      }
    ];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ events: testEvents }),
    });

    render(
      <MemoryRouter>
        <PlannerDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Average attendance calculation:
      // Total guests: 100 + 50 = 150
      // Average: 150 / 2 = 75
      // Past average: 50 / 1 = 50
      // Percentage change: ((75 - 50) / 50) * 100 = 50%
      expect(screen.getByText("+50%")).toBeInTheDocument();
    });
  });

  it("handles empty events array in API response", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ events: [] }),
    });

    render(
      <MemoryRouter>
        <PlannerDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("upcoming-events", {name:"0"})).toBeInTheDocument(); // Upcoming events count
      expect(screen.getByTestId("avg-attendance", {name: "0"})).toBeInTheDocument(); // Average attendance
      expect(screen.getByText("You have no upcoming events")).toBeInTheDocument();
    });
  });


  it("handles authentication state changes correctly", async () => {
    // Test with null user (not logged in)
    const { unmount } = render(
      <MemoryRouter>
        <PlannerDashboard />
      </MemoryRouter>
    );

    // Should not call fetch when user is null
    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled();
    });
    
    unmount();
  });
});