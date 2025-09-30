import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, beforeEach, vi, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AdminProfileEdit from "../../pages/admin/adminProfile/AdminProfileEdit";
let currentUser = { uid: "test-admin", getIdToken: vi.fn(() => Promise.resolve("mock-token")) };
vi.mock("firebase/auth", () => {
  const mockAuth = {
    currentUser: {
      uid: "test-admin",
      getIdToken: vi.fn(() => Promise.resolve("mock-token")),
    },
  };

  return {
    getAuth: () => mockAuth,
    onAuthStateChanged: (auth, callback) => {
      callback(auth.currentUser);
      return () => {};
    },
  };
});

// --- Mock react-router-dom ---
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// --- Global mocks ---
global.fetch = vi.fn();
global.console = { error: vi.fn() };

describe("AdminProfileEdit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUser = { uid: "test-admin", getIdToken: vi.fn(() => Promise.resolve("mock-token")) };
  });
  

  it("renders loading state initially", () => {
    render(
      <MemoryRouter>
        <AdminProfileEdit />
      </MemoryRouter>
    );
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
  });

  it("renders fetched profile data", async () => {
    const mockData = { fullName: "Admin User", phone: "1234567890" };
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    render(
      <MemoryRouter>
        <AdminProfileEdit />
      </MemoryRouter>
    );

    await waitFor(() => screen.getByDisplayValue("Admin User"));
    expect(screen.getByDisplayValue("1234567890")).toBeInTheDocument();
  });

  it("shows error if fetch fails", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ message: "Failed to fetch profile" }),
    });

    render(
      <MemoryRouter>
        <AdminProfileEdit />
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(screen.getByText(/Failed to fetch profile/i)).toBeInTheDocument()
    );
  });

  it("navigates back on Back to Profile click", async () => {
    const mockData = { fullName: "Admin User", phone: "1234567890" };
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    render(
      <MemoryRouter>
        <AdminProfileEdit />
      </MemoryRouter>
    );

    await waitFor(() => screen.getByText("Back to Profile"));
    fireEvent.click(screen.getByText("Back to Profile"));
    expect(mockNavigate).toHaveBeenCalledWith("/admin/profile");
  });

  it("submits profile update successfully", async () => {
    const mockData = { fullName: "Admin User", phone: "1234567890" };
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      }) // initial fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: "Updated" }),
      }); // PUT request

    render(
      <MemoryRouter>
        <AdminProfileEdit />
      </MemoryRouter>
    );

    await waitFor(() => screen.getByDisplayValue("Admin User"));

    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: "New Name" },
    });
    fireEvent.change(screen.getByLabelText(/Phone/i), {
      target: { value: "9876543210" },
    });

    fireEvent.click(screen.getByText(/Save Changes/i));

    await waitFor(() =>
      expect(screen.getByText(/Profile updated successfully!/i)).toBeInTheDocument()
    );
  });


});
