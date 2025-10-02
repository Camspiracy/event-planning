// src/tests/Signup.test.jsx
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, vi, beforeEach, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Signup, { createPlannerAccount } from "../pages/Signup.jsx";

import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

// --- Mocks ---
const mockNavigate = vi.fn();

// Mock react-router-dom
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

// Mock firebase/auth
vi.mock("firebase/auth");

// Mock the firebase module exporting auth
vi.mock("../firebase.js", () => ({ auth: {} }));

// Mock the createPlannerAccount function
vi.mock("../pages/Signup.jsx", async () => {
  const actual = await vi.importActual("../pages/Signup.jsx");
  return { ...actual, createPlannerAccount: vi.fn() };
});

describe("Signup Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(GoogleAuthProvider).mockImplementation(() => ({}));
    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>
    );
  });

  it("renders all form elements correctly", () => {
    expect(screen.getByRole("heading", { name: /Sign UP!/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/you@example.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Sign Up$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign up with Google/i })).toBeInTheDocument();
  });

  it("updates email and password fields on user input", () => {
    const emailInput = screen.getByPlaceholderText(/you@example.com/i);
    const passwordInput = screen.getByPlaceholderText(/Password/i);

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });

    expect(emailInput.value).toBe("test@example.com");
    expect(passwordInput.value).toBe("password123");
  });


  it("displays error for failed signup", async () => {
    vi.mocked(createUserWithEmailAndPassword).mockRejectedValueOnce({
      code: "auth/email-already-in-use",
    });

    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), {
      target: { value: "existing@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Sign Up$/i }));
;
    


    await waitFor(() => {
      expect(screen.getByText(/Account with this email already exists/i)).toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  

  it("displays error for failed Google signup", async () => {
    vi.mocked(signInWithPopup).mockRejectedValueOnce({ code: "auth/popup-closed-by-user" });

    fireEvent.click(screen.getByRole("button", { name: /Sign up with Google/i }));

    await waitFor(() => {
      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
