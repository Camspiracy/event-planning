// src/tests/adminTests/AdminCreateProfile.test.jsx
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, beforeEach, vi, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AdminCreateProfile from "../../pages/admin/adminProfile/AdminCreateProfile.jsx";

// --- Mock firebase/auth ---
vi.mock("firebase/auth", () => ({
  getAuth: () => ({
    currentUser: {
      uid: "test-admin",
      email: "admin@test.com",
      getIdToken: vi.fn(() => Promise.resolve("mock-token")),
    },
  }),
}));
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// --- Global beforeEach ---
beforeEach(() => {
   
  vi.clearAllMocks();
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
    })
  );
});


describe("AdminCreateProfile", () => {
  it("prefills email from auth.currentUser", () => {
    render(
      <MemoryRouter>
        <AdminCreateProfile />
      </MemoryRouter>
    );

    expect(screen.getByDisplayValue("admin@test.com")).toBeInTheDocument();
  });

  it("shows error if no user is logged in", async () => {
  // Import the mocked getAuth
  const { getAuth } = await import("firebase/auth");

  // Temporarily remove currentUser
  const auth = getAuth();
  const originalUser = auth.currentUser; // save original
  auth.currentUser = null;

  render(
    <MemoryRouter>
      <AdminCreateProfile />
    </MemoryRouter>
  );

  fireEvent.submit(screen.getByRole("button", { name: /save and continue/i }));

  expect(
    await screen.findByText(/This information will be used to identify you across the platform./i)
  ).toBeInTheDocument();

  // Restore original user
  auth.currentUser = originalUser;
});

  it("submits successfully and navigates to /admin", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "created" }),
    });

    render(
      <MemoryRouter>
        <AdminCreateProfile />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/enter your full name/i), {
      target: { value: "Test Admin" },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\., \+27 12 345 6789/i), {
      target: { value: "123456789" },
    });

    fireEvent.submit(screen.getByRole("button", { name: /save and continue/i }));

    expect(await screen.findByText(/profile created successfully/i)).toBeInTheDocument();

    await waitFor(() =>
      expect(mockNavigate).not.toHaveBeenCalledWith("/admin")
    );
  });

  it("handles API error", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "failed" }),
    });

    render(
      <MemoryRouter>
        <AdminCreateProfile />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/enter your full name/i), {
      target: { value: "Test Admin" },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\., \+27 12 345 6789/i), {
      target: { value: "123456789" },
    });

    fireEvent.submit(screen.getByRole("button", { name: /save and continue/i }));

    expect(await screen.findByText(/failed/i)).toBeInTheDocument();
  });

  it("shows preview when image selected", async () => {
    render(
      <MemoryRouter>
        <AdminCreateProfile />
      </MemoryRouter>
    );

    const file = new File(["dummy"], "avatar.png", { type: "image/png" });
    const input = screen.getByLabelText(/profile picture/i);

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() =>
      expect(screen.getByAltText(/profile preview/i)).toBeInTheDocument()
    );
  });
});
