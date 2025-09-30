// src/tests/plannerTests/PlannerRSVP.test.jsx
/**
 * @vitest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, beforeEach, vi, expect } from "vitest";
import PlannerRSVP from "../../pages/planner/PlannerRSVP";

// Helper render wrapper
const renderWithRouter = (ui, { route = '/' } = {}) => {
  window.history.pushState({}, 'Test page', route);
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
};

describe("PlannerRSVP", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  const mockEventData = {
    name: "Tech Conference 2024",
    date: "2024-12-01T10:00:00Z"
  };

  const mockGuestData = {
    firstname: "John",
    email: "john@example.com"
  };

  const mockSuccessResponse = {
    event: mockEventData,
    guest: mockGuestData
  };

  it("shows loading state initially", async () => {
    // Mock a delayed response to see loading state
    global.fetch.mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => 
        resolve({
          ok: true,
          json: () => Promise.resolve(mockSuccessResponse)
        }), 100)
      )
    );

    renderWithRouter(<PlannerRSVP />, { 
      route: '/rsvp/event123/guest456/accept' 
    });

    expect(screen.getByText("Processing your RSVP...")).toBeInTheDocument();
    expect(screen.getByText("Please wait while we update your response.")).toBeInTheDocument();
  });

  it("processes successful RSVP acceptance", async () => {
    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSuccessResponse)
      })
    );

    renderWithRouter(<PlannerRSVP />, { 
      route: '/rsvp/event123/guest456/accept' 
    });

    await waitFor(() => {
      expect(screen.getByText("RSVP Confirmed!")).toBeInTheDocument();
    });

    expect(screen.getByText("Thank you, John! We're excited to have you join us.")).toBeInTheDocument();
    expect(screen.getByText("Tech Conference 2024")).toBeInTheDocument();
    expect(screen.getByText(/A confirmation email has been sent to john@example.com/)).toBeInTheDocument();
  });

  it("processes successful RSVP decline", async () => {
    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSuccessResponse)
      })
    );

    renderWithRouter(<PlannerRSVP />, { 
      route: '/rsvp/event123/guest456/decline' 
    });

    await waitFor(() => {
      expect(screen.getByText("Response Received")).toBeInTheDocument();
    });

    expect(screen.getByText("Thank you for your response, John. We're sorry you won't be able to join us.")).toBeInTheDocument();
    expect(screen.getByText("If your plans change, please feel free to contact the event organizer.")).toBeInTheDocument();
  });

  it("handles invalid URL format", async () => {
    renderWithRouter(<PlannerRSVP />, { 
      route: '/rsvp/incomplete' 
    });

    await waitFor(() => {
      expect(screen.getByText("Invalid RSVP URL format")).toBeInTheDocument();
    });

    expect(screen.getByText("Oops! Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Try Again")).toBeInTheDocument();
  });

  it("handles API error response", async () => {
    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 404,
        text: () => Promise.resolve("Guest not found")
      })
    );

    renderWithRouter(<PlannerRSVP />, { 
      route: '/rsvp/event123/guest456/accept' 
    });

    await waitFor(() => {
      expect(screen.getByText(/Failed to process RSVP/)).toBeInTheDocument();
    });
  });

  it("handles network errors", async () => {
    global.fetch.mockImplementationOnce(() =>
      Promise.reject(new Error("Network error"))
    );

    renderWithRouter(<PlannerRSVP />, { 
      route: '/rsvp/event123/guest456/accept' 
    });

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("handles invalid response parameter", async () => {
    renderWithRouter(<PlannerRSVP />, { 
      route: '/rsvp/event123/guest456/invalid' 
    });

    await waitFor(() => {
      expect(screen.getByText("Invalid RSVP response")).toBeInTheDocument();
    });
  });

  it("handles missing parameters in URL", async () => {
    renderWithRouter(<PlannerRSVP />, { 
      route: '/rsvp/event123' 
    });

    await waitFor(() => {
      expect(screen.getByText("Invalid RSVP URL format")).toBeInTheDocument();
    });
  });

  

 

  it("handles missing guest data gracefully", async () => {
    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          event: mockEventData,
          guest: null
        })
      })
    );

    renderWithRouter(<PlannerRSVP />, { 
      route: '/rsvp/event123/guest456/accept' 
    });

    await waitFor(() => {
      expect(screen.getByText("Thank you, Guest! We're excited to have you join us.")).toBeInTheDocument();
      expect(screen.getByText(/A confirmation email has been sent to your email address/)).toBeInTheDocument();
    });
  });

  it("formats event date correctly", async () => {
    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSuccessResponse)
      })
    );

    renderWithRouter(<PlannerRSVP />, { 
      route: '/rsvp/event123/guest456/accept' 
    });

    await waitFor(() => {
      expect(screen.getByText("Tech Conference 2024")).toBeInTheDocument();
    });

    // The date should be formatted based on the locale
    const dateElement = screen.getByText(new Date(mockEventData.date).toLocaleDateString());
    expect(dateElement).toBeInTheDocument();
  });

  it("handles different URL path structures", async () => {
    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSuccessResponse)
      })
    );

    // Test with nested path
    renderWithRouter(<PlannerRSVP />, { 
      route: '/app/rsvp/event123/guest456/accept' 
    });

    await waitFor(() => {
      expect(screen.getByText("RSVP Confirmed!")).toBeInTheDocument();
    });
  });

  it("shows PlanIT branding", async () => {
    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSuccessResponse)
      })
    );

    renderWithRouter(<PlannerRSVP />, { 
      route: '/rsvp/event123/guest456/accept' 
    });

    await waitFor(() => {
      expect(screen.getByText("PlanIT")).toBeInTheDocument();
      expect(screen.getByText("Event Management")).toBeInTheDocument();
      expect(screen.getByText("The PlanIT Team")).toBeInTheDocument();
    });
  });

  

  it("handles malformed JSON response", async () => {
    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.reject(new Error("Invalid JSON"))
      })
    );

    renderWithRouter(<PlannerRSVP />, { 
      route: '/rsvp/event123/guest456/accept' 
    });

    await waitFor(() => {
      expect(screen.getByText(/Invalid JSON/)).toBeInTheDocument();
    });
  });

  it("handles very long loading state", async () => {
    // Mock a very long delay
    global.fetch.mockImplementationOnce(() => 
      new Promise(() => {}) // Never resolves
    );

    renderWithRouter(<PlannerRSVP />, { 
      route: '/rsvp/event123/guest456/accept' 
    });

    // Should show loading state indefinitely
    expect(screen.getByText("Processing your RSVP...")).toBeInTheDocument();
    
    // Verify no error or success state appears
    await waitFor(() => {
      expect(screen.queryByText("RSVP Confirmed!")).not.toBeInTheDocument();
      expect(screen.queryByText("Oops! Something went wrong")).not.toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it("handles URL with extra parameters", async () => {
    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSuccessResponse)
      })
    );

    // URL with extra query parameters
    renderWithRouter(<PlannerRSVP />, { 
      route: '/rsvp/event123/guest456/accept?source=email&campaign=winter' 
    });

    await waitFor(() => {
      expect(screen.getByText("RSVP Confirmed!")).toBeInTheDocument();
    });
  });

  it("handles case sensitivity in response parameter", async () => {
    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSuccessResponse)
      })
    );

    // Test with uppercase (should still work as the component checks lowercase)
    renderWithRouter(<PlannerRSVP />, { 
      route: '/rsvp/event123/guest456/ACCEPT' 
    });

    await waitFor(() => {
      expect(screen.getByText("Invalid RSVP response")).toBeInTheDocument();
    });
  });
});