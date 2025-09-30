import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, beforeEach, afterEach, vi, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";

// Successful response
global.fetch.mockResolvedValueOnce({
  ok: true,
  json: async () => ({ services: [] }), // must be a function returning a Promise
});

// Error response
global.fetch.mockResolvedValueOnce({
  ok: false,
  json: async () => ({ message: "Server error" }),
});

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = function() {};
});

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


// MOCKS
// --- Mock firebase/auth ---
const mockAuth = {
  currentUser: {
    uid: "test-planner",
    getIdToken: vi.fn(() => Promise.resolve("mock-token")),
  },
};

vi.mock("firebase/auth", () => ({
  getAuth: () => mockAuth,
}));

// --- Mock components that aren't under test ---
vi.mock("./InformationToolTip", () => ({
  default: ({ children, content }) => (
    <div data-testid="tooltip" title={content}>
      {children}
    </div>
  ),
}));

vi.mock("./ChatComponent", () => ({
  default: ({ plannerId, vendorId, eventId, currentUser, otherUser, closeChat }) => (
    <div data-testid="chat-component">
      <div>Chat: {plannerId} - {vendorId} - {eventId}</div>
      <div>Current User: {currentUser.name}</div>
      <div>Other User: {otherUser.name}</div>
      <button onClick={closeChat}>Close Chat</button>
    </div>
  ),
}));

vi.mock("./ConfirmPopup", () => ({
  default: ({ show, onConfirm, onCancel, children }) =>
    show ? (
      <div data-testid="confirm-popup">
        <div>{children}</div>
        <button onClick={onConfirm}>Confirm</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    ) : null,
}));



// --- Mock global functions ---
global.fetch = vi.fn();
global.alert = vi.fn();

import PlannerVendorMarketplace from "../../pages/planner/PlannerVendorMarketplace";

const mockVendors = [
  {
    id: "vendor1",
    businessName: "Test Catering Co",
    category: "Catering",
    location: "Johannesburg",
    rating: "4.5",
    profilePic: "https://example.com/pic1.jpg",
    description: "Professional catering services",
    phone: "0123456789",
    email: "test@catering.com",
  },
  {
    id: "vendor2",
    businessName: "Music Masters",
    category: "Entertainment",
    location: "Cape Town",
    rating: "4.8",
    profilePic: "https://example.com/pic2.jpg",
    description: "Live music entertainment",
    phone: "0987654321",
    email: "info@musicmasters.com",
  },
];

const mockEvents = [
  {
    id: "event1",
    name: "Wedding Reception",
    date: { _seconds: 1735689600, _nanoseconds: 0 }, // Jan 1, 2025
  },
  {
    id: "event2",
    name: "Corporate Event",
    date: "2025-02-15T10:00:00Z",
  },
];

const mockServices = [
  {
    id: "service1",
    serviceName: "Wedding Catering",
    cost: 5000,
    chargeByHour: 100,
    chargePerPerson: 50,
    chargePerSquareMeter: 0,
    extraNotes: "Includes 3-course meal",
  },
  {
    id: "service2",
    serviceName: "Cocktail Service",
    cost: 2000,
    chargeByHour: 0,
    chargePerPerson: 25,
    chargePerSquareMeter: 0,
    extraNotes: "Premium bar service",
  },
];

describe("PlannerVendorMarketplace", () => {
  beforeEach(() => {
    global.fetch.mockClear();
    global.alert.mockClear();
    mockAuth.currentUser.getIdToken.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    render(
      <MemoryRouter>
        <PlannerVendorMarketplace plannerId="test-planner" />
      </MemoryRouter>
    );

    expect(screen.getByText(/Loading vendors/i)).toBeInTheDocument();
    expect(screen.getByRole("article", { class: /loading-spinner/i })).toBeInTheDocument();
  });

  it("renders marketplace header and tabs", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ vendors: [] }),
    });

    render(
      <MemoryRouter>
        <PlannerVendorMarketplace plannerId="test-planner" />
      </MemoryRouter>
    );

    expect(screen.getByText("Vendor Marketplace")).toBeInTheDocument();
    expect(screen.getByText("Discover and connect with top-rated event vendors")).toBeInTheDocument();
    expect(screen.getByText("All Events")).toBeInTheDocument();
    expect(screen.getByText("Event Specific")).toBeInTheDocument();
  });

  it("fetches and displays vendors for all events tab", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ vendors: mockVendors }),
    });

    render(
      <MemoryRouter>
        <PlannerVendorMarketplace plannerId="test-planner" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Catering Co")).toBeInTheDocument();
      expect(screen.getByText("Music Masters")).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://us-central1-planit-sdp.cloudfunctions.net/api/planner/test-planner/bestVendors",
      expect.objectContaining({
        headers: {
          Authorization: "Bearer mock-token",
          "Content-Type": "application/json",
        },
      })
    );
  });

  it("switches to event specific tab and shows event selector", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ vendors: [] }),
    });

    render(
      <MemoryRouter>
        <PlannerVendorMarketplace plannerId="test-planner" />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.queryByText(/Loading vendors/i)).not.toBeInTheDocument());

    fireEvent.click(screen.getByText("Event Specific"));

    expect(screen.getByText("Selected Event:")).toBeInTheDocument();
    expect(screen.getByText("Choose an event...")).toBeInTheDocument();
  });

  it("opens event selection modal when switching to event specific tab", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ vendors: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ events: mockEvents }),
      });

    render(
      <MemoryRouter>
        <PlannerVendorMarketplace plannerId="test-planner" />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.queryByText(/Loading vendors/i)).not.toBeInTheDocument());

    fireEvent.click(screen.getByText("Event Specific"));

    await waitFor(() => {
      expect(screen.getByText("Select Event")).toBeInTheDocument();
      expect(screen.getByText("Wedding Reception")).toBeInTheDocument();
    });
  });

  it("selects an event and fetches event-specific vendors", async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes("/bestVendors")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ vendors: [mockVendors[0]] }),
        });
      }
      if (url.includes("/events")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ events: mockEvents }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ vendors: [] }),
      });
    });


    render(
      <MemoryRouter>
        <PlannerVendorMarketplace plannerId="test-planner" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "https://us-central1-planit-sdp.cloudfunctions.net/api/planner/test-planner/bestVendors",
        expect.objectContaining({
          headers: {
            Authorization: "Bearer mock-token",
            "Content-Type": "application/json"
          },
        })
      );
    });
    
    fireEvent.click(screen.getByText("Event Specific"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "https://us-central1-planit-sdp.cloudfunctions.net/api/planner/me/events",
        expect.objectContaining({
          headers: {
            Authorization: "Bearer mock-token",
            "Content-Type": "application/json"
          },
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Wedding Reception")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Wedding Reception"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "https://us-central1-planit-sdp.cloudfunctions.net/api/planner/events/event1/bestVendors",
        expect.objectContaining({
          headers: {
            Authorization: "Bearer mock-token",
            "Content-Type": "application/json"
          },
        })
      );
    })


    await waitFor(() => {
      expect(screen.getByText("Test Catering Co")).toBeInTheDocument();
    });

  });

  it("filters vendors by search term", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ vendors: mockVendors }),
    });

    render(
      <MemoryRouter>
        <PlannerVendorMarketplace plannerId="test-planner" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Catering Co")).toBeInTheDocument();
      expect(screen.getByText("Music Masters")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search vendors...");
    fireEvent.change(searchInput, { target: { value: "catering" } });

    expect(screen.getByText("Test Catering Co")).toBeInTheDocument();
    expect(screen.queryByText("Music Masters")).not.toBeInTheDocument();
  });

  it("filters vendors by category", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ vendors: mockVendors }),
    });

    render(
      <MemoryRouter>
        <PlannerVendorMarketplace plannerId="test-planner" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Catering Co")).toBeInTheDocument();
      expect(screen.getByText("Music Masters")).toBeInTheDocument();
    });

    const categorySelect = screen.getByDisplayValue("All Categories");
    fireEvent.change(categorySelect, { target: { value: "Catering" } });

    expect(screen.getByText("Test Catering Co")).toBeInTheDocument();
    expect(screen.queryByText("Music Masters")).not.toBeInTheDocument();
  });

  it("opens vendor modal when clicking view details", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ vendors: mockVendors }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockServices),
      });

    render(
      <MemoryRouter>
        <PlannerVendorMarketplace plannerId="test-planner" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Catering Co")).toBeInTheDocument();
    });

    const viewDetailsButton = screen.getAllByText("View Details")[0];
    fireEvent.click(viewDetailsButton);

    await waitFor(() => {
      expect(screen.getByText("About")).toBeInTheDocument();
      expect(screen.getByText("Services (2)")).toBeInTheDocument();
      expect(screen.getByText("Professional catering services")).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://us-central1-planit-sdp.cloudfunctions.net/api/vendors/vendor1/services",
      expect.objectContaining({
        headers: {
          Authorization: "Bearer mock-token",
        },
      })
    );
  });

  it("displays vendor services in modal", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ vendors: mockVendors }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockServices),
      });

    render(
      <MemoryRouter>
        <PlannerVendorMarketplace plannerId="test-planner" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Catering Co")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText("View Details")[0]);

    await waitFor(() => {
      expect(screen.getByText("Services (2)")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Services (2)"));

    expect(screen.getByText("Wedding Catering")).toBeInTheDocument();
    expect(screen.getByText("Cocktail Service")).toBeInTheDocument();
    expect(screen.getByText("R 5000 Per Hour")).toBeInTheDocument();
    expect(screen.getByText("R 25 Per Person")).toBeInTheDocument();
  });

  it("tracks service when clicking track service button", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ vendors: mockVendors }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockServices),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ events: mockEvents }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

    render(
      <MemoryRouter>
        <PlannerVendorMarketplace plannerId="test-planner" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Catering Co")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText("View Details")[0]);

    await waitFor(() => {
      fireEvent.click(screen.getByText("Services (2)"));
    });

    const trackServiceButtons = screen.getAllByText("Track Service");
    fireEvent.click(trackServiceButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Wedding Reception")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Wedding Reception"));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith("Vendor added to event successfully!");
    });
  });

  it("opens chat when contact vendor is clicked with event context", async () => {
    const mockEvent = mockEvents[0];
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ events: mockEvents }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ vendors: mockVendors }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockServices),
      });

    render(
      <MemoryRouter>
        <PlannerVendorMarketplace event={mockEvent} plannerId="test-planner" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Catering Co")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText("View Details")[0]);

    await waitFor(() => {
      expect(screen.getByText("Contact Vendor")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Contact Vendor"));

    await waitFor(() => {
      expect(screen.getByTestId("chat-component")).toBeInTheDocument();
      expect(screen.getByTestId("message-input-area")).toBeInTheDocument();
      expect(screen.getByTestId("send-button")).toBeInTheDocument();
      expect(screen.getByTestId("chat-header")).toBeInTheDocument();
    });
  });

  it("closes chat when close chat button is clicked", async () => {
    const mockEvent = mockEvents[0];
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ events: mockEvents }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ vendors: mockVendors }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockServices),
      });

    render(
      <MemoryRouter>
        <PlannerVendorMarketplace event={mockEvent} plannerId="test-planner" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Catering Co")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText("View Details")[0]);

    await waitFor(() => {
      expect(screen.getByTestId("vendor-view-more-modal")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Contact Vendor"));

    await waitFor(() => {
      expect(screen.getByTestId("chat-component")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("close-chat"));

    expect(screen.queryByTestId("chat-component")).not.toBeInTheDocument();
  });

  it("shows event selection modal for chat when no event context", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ vendors: mockVendors }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockServices),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ events: mockEvents }),
      });

    render(
      <MemoryRouter>
        <PlannerVendorMarketplace plannerId="test-planner" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Catering Co")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText("View Details")[0]);

    await waitFor(() => {
      expect(screen.getByTestId("vendor-view-more-modal")).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByRole("button", {name: "Contact Vendor"}));

    await waitFor(() => {
      expect(screen.getByText("Select Event for Chat")).toBeInTheDocument();
    });
  });

  it("handles API error when fetching vendors", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(
      <MemoryRouter>
        <PlannerVendorMarketplace plannerId="test-planner" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("No vendors found matching your criteria.")).toBeInTheDocument();
    });
  });

  it("handles API error when fetching services", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ vendors: mockVendors }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

    render(
      <MemoryRouter>
        <PlannerVendorMarketplace plannerId="test-planner" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Catering Co")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText("View Details")[0]);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith("Failed to fetch vendor services");
    });
  });

  it("closes vendor modal when close button is clicked", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ vendors: mockVendors }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockServices),
      });

    render(
      <MemoryRouter>
        <PlannerVendorMarketplace plannerId="test-planner" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Catering Co")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText("View Details")[0]);

    await waitFor(() => {
      expect(screen.getByText("About")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Close"));

    expect(screen.queryByText("About")).not.toBeInTheDocument();
  });

  it("displays empty state when no vendors match criteria", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ vendors: [] }),
    });

    render(
      <MemoryRouter>
        <PlannerVendorMarketplace plannerId="test-planner" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("No vendors found matching your criteria.")).toBeInTheDocument();
    });
  });

  it("shows correct empty state message for event specific tab", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ vendors: [] }),
    });

    render(
      <MemoryRouter>
        <PlannerVendorMarketplace plannerId="test-planner" />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.queryByText(/Loading vendors/i)).not.toBeInTheDocument());

    fireEvent.click(screen.getByText("Event Specific"));

    await waitFor(() => {
      expect(screen.getByText("No vendors found matching your criteria.")).toBeInTheDocument();
      expect(screen.getByText("Please select an event to view vendors.")).toBeInTheDocument();
    });
  });
});