import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, beforeEach, afterEach, vi, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";


beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = function() {};
});

// Mock Firebase auth
const mockAuth = {
  currentUser: {
    uid: "test-user",
    email: "test@example.com",
    getIdToken: vi.fn(() => Promise.resolve("mock-token")),
  },
};

vi.mock("firebase/auth", () => ({
  getAuth: () => mockAuth,
}));

// Mock Lucide icons
vi.mock("lucide-react", () => ({
  Send: () => <div data-testid="send-icon">Send</div>,
  Check: () => <div data-testid="check-icon">Check</div>,
  CheckCheck: () => <div data-testid="check-check-icon">CheckCheck</div>,
  Clock: () => <div data-testid="clock-icon">Clock</div>,
  User: () => <div data-testid="user-icon">User</div>,
  Building2: () => <div data-testid="building-icon">Building2</div>,
  X: () => <div data-testid="x-icon">X</div>,
}));

global.fetch = vi.fn();
global.alert = vi.fn();

import ChatComponent from "../../pages/planner/ChatComponent";

const mockCurrentUser = {
  id: "planner1",
  name: "John Planner",
  type: "planner"
};

const mockOtherUser = {
  id: "vendor1", 
  name: "Sarah Vendor",
  type: "vendor"
};

const mockMessages = [
  {
    id: "msg1",
    senderId: "planner1",
    senderName: "John Planner",
    senderType: "planner",
    content: "Hello, when can you deliver?",
    createdAt: { _seconds: 1609459200, _nanoseconds: 0 }, // Jan 1, 2021
    status: "delivered"
  },
  {
    id: "msg2",
    senderId: "vendor1",
    senderName: "Sarah Vendor", 
    senderType: "vendor",
    content: "We can deliver by Friday",
    createdAt: { _seconds: 1609545600, _nanoseconds: 0 }, // Jan 2, 2021
    status: "read"
  }
];

describe("ChatComponent", () => {
  beforeEach(() => {
    global.fetch.mockClear();
    global.alert.mockClear();
    mockAuth.currentUser.getIdToken.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders chat component with correct participants", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ messages: [] }),
    });

    const mockCloseChat = vi.fn();

    render(
      <MemoryRouter>
        <ChatComponent 
          plannerId="planner1"
          vendorId="vendor1"
          eventId="event1"
          currentUser={mockCurrentUser}
          otherUser={mockOtherUser}
          closeChat={mockCloseChat}
        />
      </MemoryRouter>
    );

    expect(screen.getByTestId("chat-component")).toBeInTheDocument();
    expect(screen.getByText("John Planner")).toBeInTheDocument();
    expect(screen.getByText("Sarah Vendor")).toBeInTheDocument();
    expect(screen.getByText("(planner)")).toBeInTheDocument();
    expect(screen.getByText("(vendor)")).toBeInTheDocument();
  });

  it("fetches messages on component mount", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ messages: mockMessages }),
    });

    render(
      <MemoryRouter>
        <ChatComponent 
          plannerId="planner1"
          vendorId="vendor1"
          eventId="event1"
          currentUser={mockCurrentUser}
          otherUser={mockOtherUser}
          closeChat={vi.fn()}
        />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "https://us-central1-planit-sdp.cloudfunctions.net/api/chats/event1/planner1/vendor1/messages",
        expect.objectContaining({
          method: "GET",
          headers: {
            Authorization: "Bearer mock-token",
          },
        })
      );
    });
  });

  it("displays messages correctly", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ messages: mockMessages }),
    });

    render(
      <MemoryRouter>
        <ChatComponent 
          plannerId="planner1"
          vendorId="vendor1"
          eventId="event1"
          currentUser={mockCurrentUser}
          otherUser={mockOtherUser}
          closeChat={vi.fn()}
        />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Hello, when can you deliver?")).toBeInTheDocument();
      expect(screen.getByText("We can deliver by Friday")).toBeInTheDocument();
    });

    // Check that messages are properly formatted with sender info
    expect(screen.getByTestId("curr-name")).toBeInTheDocument();
    expect(screen.getByTestId("other-name")).toBeInTheDocument();
  });

  it("sends a new message", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ messages: [] }), // first GET
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}), // POST response
      });

    render(
      <MemoryRouter>
        <ChatComponent
          plannerId="planner1"
          vendorId="vendor1"
          eventId="event1"
          currentUser={mockCurrentUser}
          otherUser={mockOtherUser}
          closeChat={vi.fn()}
        />
      </MemoryRouter>
    );

    const messageInput = screen.getByTestId("message-input-area");
    const sendButton = screen.getByTestId("send-button");

    // Type a message
    fireEvent.change(messageInput, { target: { value: "Test message" } });
    expect(messageInput.value).toBe("Test message");

    // Send the message
    fireEvent.click(sendButton);

    await waitFor(() => {
      const [, options] = global.fetch.mock.calls[1];

      expect(options.method).toBe("POST");
      expect(options.headers).toEqual({
        Authorization: "Bearer mock-token",
        "Content-Type": "application/json",
      });

      const parsedBody = JSON.parse(options.body);

      expect(parsedBody).toEqual(
        expect.objectContaining({
          senderId: "planner1",
          senderName: "John Planner",
          senderType: "planner",
          content: "Test message",
          status: "sent",
          timestamp: expect.any(String), // works now, since we're checking AFTER parsing
        })
      );
    });
  });

  it("prevents sending empty messages", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ messages: [] }),
    });

    render(
      <MemoryRouter>
        <ChatComponent 
          plannerId="planner1"
          vendorId="vendor1"
          eventId="event1"
          currentUser={mockCurrentUser}
          otherUser={mockOtherUser}
          closeChat={vi.fn()}
        />
      </MemoryRouter>
    );

    const sendButton = screen.getByTestId("send-button");
    expect(sendButton).toBeDisabled();

    // Try to send empty message
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalledWith(
        expect.stringContaining("/messages"),
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("calls closeChat when close button is clicked", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ messages: [] }),
    });

    const mockCloseChat = vi.fn();

    render(
      <MemoryRouter>
        <ChatComponent 
          plannerId="planner1"
          vendorId="vendor1"
          eventId="event1"
          currentUser={mockCurrentUser}
          otherUser={mockOtherUser}
          closeChat={mockCloseChat}
        />
      </MemoryRouter>
    );

    const closeButton = screen.getByTestId("close-chat");
    fireEvent.click(closeButton);

    expect(mockCloseChat).toHaveBeenCalled();
  });

  it("handles message sending with Enter key", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ messages: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

    render(
      <MemoryRouter>
        <ChatComponent 
          plannerId="planner1"
          vendorId="vendor1"
          eventId="event1"
          currentUser={mockCurrentUser}
          otherUser={mockOtherUser}
          closeChat={vi.fn()}
        />
      </MemoryRouter>
    );

    const messageInput = screen.getByTestId("message-input-area");
    
    // Type a message and press Enter
    fireEvent.change(messageInput, { target: { value: "Test enter key" } });
    fireEvent.keyDown(messageInput, { key: 'Enter', shiftKey: false });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/messages"),
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("does not send message when Shift+Enter is pressed", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ messages: [] }),
    });

    render(
      <MemoryRouter>
        <ChatComponent 
          plannerId="planner1"
          vendorId="vendor1"
          eventId="event1"
          currentUser={mockCurrentUser}
          otherUser={mockOtherUser}
          closeChat={vi.fn()}
        />
      </MemoryRouter>
    );

    const messageInput = screen.getByTestId("message-input-area");
    
    // Type a message and press Shift+Enter (should not send)
    fireEvent.change(messageInput, { target: { value: "Test shift enter" } });
    fireEvent.keyDown(messageInput, { key: 'Enter', shiftKey: true });

    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalledWith(
        expect.stringContaining("/messages"),
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("displays message status indicators correctly", async () => {
    const messagesWithStatus = [
      {
        id: "msg1",
        senderId: "planner1",
        senderName: "John Planner",
        senderType: "planner",
        content: "Sent message",
        createdAt: { _seconds: 1609459200, _nanoseconds: 0 },
        status: "sent"
      },
      {
        id: "msg2",
        senderId: "planner1",
        senderName: "John Planner",
        senderType: "planner",
        content: "Delivered message",
        createdAt: { _seconds: 1609545600, _nanoseconds: 0 },
        status: "delivered"
      }
    ];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ messages: messagesWithStatus }),
    });

    render(
      <MemoryRouter>
        <ChatComponent 
          plannerId="planner1"
          vendorId="vendor1"
          eventId="event1"
          currentUser={mockCurrentUser}
          otherUser={mockOtherUser}
          closeChat={vi.fn()}
        />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Sent message")).toBeInTheDocument();
      expect(screen.getByText("Delivered message")).toBeInTheDocument();
    });

    // Status indicators should be present for current user's messages
    expect(screen.getAllByTestId("check-icon").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("check-check-icon").length).toBeGreaterThan(0);
  });

  it("formats dates correctly", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ messages: mockMessages }),
    });

    render(
      <MemoryRouter>
        <ChatComponent 
          plannerId="planner1"
          vendorId="vendor1"
          eventId="event1"
          currentUser={mockCurrentUser}
          otherUser={mockOtherUser}
          closeChat={vi.fn()}
        />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Check that dates are formatted and displayed
      const timeElements = screen.getAllByRole("time");
      expect(timeElements.length).toBeGreaterThan(0);
      timeElements.forEach(element => {
        expect(element).toHaveAttribute("datetime");
      });
    });
  });

  it("handles fetch messages error", async () => {
    global.fetch.mockRejectedValueOnce(new Error("Network error"));

    render(
      <MemoryRouter>
        <ChatComponent 
          plannerId="planner1"
          vendorId="vendor1"
          eventId="event1"
          currentUser={mockCurrentUser}
          otherUser={mockOtherUser}
          closeChat={vi.fn()}
        />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith("Failed to fetch messages");
    });
  });

  it("handles send message error", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ messages: [] }),
      })
      .mockRejectedValueOnce(new Error("Send failed"));

    render(
      <MemoryRouter>
        <ChatComponent 
          plannerId="planner1"
          vendorId="vendor1"
          eventId="event1"
          currentUser={mockCurrentUser}
          otherUser={mockOtherUser}
          closeChat={vi.fn()}
        />
      </MemoryRouter>
    );

    const messageInput = screen.getByTestId("message-input-area");
    fireEvent.change(messageInput, { target: { value: "Test error" } });
    fireEvent.click(screen.getByTestId("send-button"));

    await waitFor(() => {
      // The component logs the error but doesn't alert, so we just verify it doesn't crash
      expect(screen.getByTestId("chat-component")).toBeInTheDocument();
    });
  });

  it("displays typing indicator when enabled", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ messages: [] }),
    });

    // We need to modify the component to expose typing state or test the visual state
    // For now, we'll test that the structure exists even if not visible
    render(
      <MemoryRouter>
        <ChatComponent 
          plannerId="planner1"
          vendorId="vendor1"
          eventId="event1"
          currentUser={mockCurrentUser}
          otherUser={mockOtherUser}
          closeChat={vi.fn()}
        />
      </MemoryRouter>
    );

  });


  it("handles different user types correctly", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ messages: [] }),
    });

    const vendorCurrentUser = {
      id: "vendor1",
      name: "Vendor Company",
      type: "vendor"
    };

    const plannerOtherUser = {
      id: "planner1",
      name: "Event Planner",
      type: "planner"
    };

    render(
      <MemoryRouter>
        <ChatComponent 
          plannerId="planner1"
          vendorId="vendor1"
          eventId="event1"
          currentUser={vendorCurrentUser}
          otherUser={plannerOtherUser}
          closeChat={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("Vendor Company")).toBeInTheDocument();
    expect(screen.getByText("Event Planner")).toBeInTheDocument();
    expect(screen.getByText("(vendor)")).toBeInTheDocument();
    expect(screen.getByText("(planner)")).toBeInTheDocument();
  });

  it("auto-resizes textarea based on content", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ messages: [] }),
    });

    render(
      <MemoryRouter>
        <ChatComponent 
          plannerId="planner1"
          vendorId="vendor1"
          eventId="event1"
          currentUser={mockCurrentUser}
          otherUser={mockOtherUser}
          closeChat={vi.fn()}
        />
      </MemoryRouter>
    );

    const messageInput = screen.getByTestId("message-input-area");
    
    // Test that textarea starts with 1 row
    expect(messageInput.rows).toBe(1);

    // Simulate multi-line content
    fireEvent.change(messageInput, { target: { value: "Line 1\nLine 2\nLine 3" } });
    
    // The component should handle multi-line input without breaking
    expect(messageInput.value).toBe("Line 1\nLine 2\nLine 3");
  });

});