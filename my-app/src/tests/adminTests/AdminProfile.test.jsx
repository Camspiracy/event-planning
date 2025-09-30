import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, beforeEach, vi, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AdminProfile from "../../pages/admin/adminProfile/AdminProfile.jsx";

// --- Mock firebase/auth ---
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

describe("AdminProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    render(
      <MemoryRouter>
        <AdminProfile />
      </MemoryRouter>
    );
    expect(screen.getByText(/Loading Admin Profile.../i)).toBeInTheDocument();
  });

  it("renders no profile message if no admin returned", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(null),
    });

    render(
      <MemoryRouter>
        <AdminProfile />
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(
        screen.getByText(/Admin profile not found or you do not have permission/i)
      ).toBeInTheDocument()
    );
  });

  it("renders admin profile correctly when API returns data", async () => {
    const mockAdmin = {
      name: "Admin User",
      email: "admin@example.com",
      phone: "1234567890",
      profilePic: "/profile-pic.png",
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockAdmin),
    });

    render(
      <MemoryRouter>
        <AdminProfile />
      </MemoryRouter>
    );

    await waitFor(() => screen.getByText("Admin User"));

    expect(screen.getByText("Admin User")).toBeInTheDocument();
    expect(screen.getByText("Administrator")).toBeInTheDocument();
    expect(screen.getByText("admin@example.com")).toBeInTheDocument();
    expect(screen.getByText("1234567890")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      expect.stringContaining("/profile-pic.png")
    );
  });

  it("navigates to edit profile on button click", async () => {
    const mockAdmin = { name: "Admin User", email: "admin@example.com" };
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockAdmin),
    });

    render(
      <MemoryRouter>
        <AdminProfile />
      </MemoryRouter>
    );

    await waitFor(() => screen.getByText("Edit Profile"));
    fireEvent.click(screen.getByText("Edit Profile"));
    expect(mockNavigate).toHaveBeenCalledWith("/admin-edit-profile");
  });

  it("shows default phone if not provided", async () => {
    const mockAdmin = { name: "Admin User", email: "admin@example.com" };
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockAdmin),
    });

    render(
      <MemoryRouter>
        <AdminProfile />
      </MemoryRouter>
    );

    await waitFor(() => screen.getByText("Admin User"));
    expect(screen.getByText("Not provided")).toBeInTheDocument();
  });
});
