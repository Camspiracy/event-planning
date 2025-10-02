import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Login from "../pages/Login.jsx";

// Import the functions to be mocked
import {
	signInWithEmailAndPassword,
	signInWithPopup,
	sendPasswordResetEmail,
	GoogleAuthProvider,
} from "firebase/auth";

// --- Mocks ---
const mockNavigate = vi.fn();

// Mock react-router-dom
vi.mock("react-router-dom", async () => {
	const actual = await vi.importActual("react-router-dom");
	return {
		...actual,
		useNavigate: () => mockNavigate,
	};
});

// Mock the entire firebase/auth module. Vitest will hoist this.
vi.mock("firebase/auth");

// Mock the firebase module that exports auth
vi.mock("../firebase.js", () => ({
	auth: {}, // Provide a mock auth object
}));

describe("Login Component", () => {
	beforeEach(() => {
		// Clear all mock history before each test
		vi.clearAllMocks();
		// Since vi.mock hoists, we need to ensure the constructors are mocked correctly for each test
		vi.mocked(GoogleAuthProvider).mockImplementation(() => ({}));
		render(
			<MemoryRouter>
				<Login />
			</MemoryRouter>
		);
	});

	// Test 1: Initial Rendering
	it("should render all form elements correctly", () => {
		expect(
			screen.getByRole("heading", { name: /Welcome Back!/i })
		).toBeInTheDocument();
		expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /Log in with Google/i })
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Log in" })
		).toBeInTheDocument();
		expect(screen.getByText(/Forgot Password?/i)).toBeInTheDocument();
		expect(screen.getByText(/Sign up here/i)).toBeInTheDocument();
	});

	// Test 2: User Input
	it("should update email and password fields on user input", () => {
		const emailInput = screen.getByLabelText(/Email/i);
		const passwordInput = screen.getByLabelText(/Password/i);

		fireEvent.change(emailInput, { target: { value: "test@example.com" } });
		fireEvent.change(passwordInput, { target: { value: "password123" } });

		expect(emailInput.value).toBe("test@example.com");
		expect(passwordInput.value).toBe("password123");
	});

	// Test 3: Successful Email/Password Login
	it("should call signInWithEmailAndPassword and navigate on successful login", async () => {
		vi.mocked(signInWithEmailAndPassword).mockResolvedValueOnce({
			user: { uid: "123" },
		});

		fireEvent.change(screen.getByLabelText(/Email/i), {
			target: { value: "test@example.com" },
		});
		fireEvent.change(screen.getByLabelText(/Password/i), {
			target: { value: "password123" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Log in" }));

		await waitFor(() => {
			expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
				expect.any(Object),
				"test@example.com",
				"password123"
			);
			expect(mockNavigate).toHaveBeenCalledWith("/home");
		});
	});

	// Test 4: Failed Email/Password Login
	it("should display an error message on failed login", async () => {
		vi.mocked(signInWithEmailAndPassword).mockRejectedValueOnce({
			code: "auth/invalid-credential",
			message: "Invalid credential",
		});

		fireEvent.change(screen.getByLabelText(/Email/i), {
			target: { value: "wrong@example.com" },
		});
		fireEvent.change(screen.getByLabelText(/Password/i), {
			target: { value: "wrongpassword" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Log in" }));

		await waitFor(() => {
			expect(screen.getByText("Invalid credential")).toBeInTheDocument();
		});
		expect(mockNavigate).not.toHaveBeenCalled();
	});

	// Test 5: Successful Google Sign-in
	it("should call signInWithPopup and navigate on successful Google sign-in", async () => {
		vi.mocked(signInWithPopup).mockResolvedValueOnce({
			user: { uid: "456" },
		});

		fireEvent.click(
			screen.getByRole("button", { name: /Log in with Google/i })
		);

		await waitFor(() => {
			expect(signInWithPopup).toHaveBeenCalled();
			expect(mockNavigate).toHaveBeenCalledWith("/home");
		});
	});

	// Test 6: Failed Google Sign-in
	it("should display an error message on failed Google sign-in", async () => {
		vi.mocked(signInWithPopup).mockRejectedValueOnce({
			code: "auth/popup-closed-by-user",
			message: "Popup closed",
		});

		fireEvent.click(
			screen.getByRole("button", { name: /Log in with Google/i })
		);

		await waitFor(() => {
			expect(
				screen.getByText("Something went wrong")
			).toBeInTheDocument();
		});
		expect(mockNavigate).not.toHaveBeenCalled();
	});

	// Test 7: Successful Password Reset
	it("should show success message on successful password reset request", async () => {
		vi.mocked(sendPasswordResetEmail).mockResolvedValueOnce();

		fireEvent.change(screen.getByLabelText(/Email/i), {
			target: { value: "reset@example.com" },
		});
		fireEvent.click(screen.getByText(/Forgot Password?/i));

		await waitFor(() => {
			expect(sendPasswordResetEmail).toHaveBeenCalledWith(
				expect.any(Object),
				"reset@example.com"
			);
			expect(
				screen.getByText("Password reset email sent")
			).toBeInTheDocument();
		});
	});

	// Test 8: Failed Password Reset (no email)
	it("should show an error if forgot password is clicked with no email", async () => {
		fireEvent.click(screen.getByText(/Forgot Password?/i));

		await waitFor(() => {
			expect(
				screen.getByText("Enter your email first")
			).toBeInTheDocument();
		});
		expect(sendPasswordResetEmail).not.toHaveBeenCalled();
	});

	// Test 9: Navigation to Signup
	it("should have a link that points to the signup page", () => {
		const signupLink = screen.getByText("Sign up here");
		expect(signupLink).toHaveAttribute("href", "signup");
	});
});
