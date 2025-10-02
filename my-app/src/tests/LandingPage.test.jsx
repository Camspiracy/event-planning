import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import LandingPage from "../pages/LandingPage.jsx";

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
	...require("react-router-dom"),
	useNavigate: () => mockNavigate,
}));

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

describe("LandingPage", () => {
	beforeEach(() => {
		render(
			<MemoryRouter>
				<LandingPage />
			</MemoryRouter>
		);
	});

	// Rendering tests
	it("renders the navbar with logo and navigation links", () => {
		expect(screen.getByText("PLANit")).toBeInTheDocument();
		expect(screen.getByText("Features")).toBeInTheDocument();
		expect(screen.getByText("Pricing")).toBeInTheDocument();
		expect(screen.getByText("Contact")).toBeInTheDocument();
		expect(screen.getByText("Documentation")).toBeInTheDocument();
		expect(screen.getByText("Sign In")).toBeInTheDocument();
		expect(screen.getByText("Get Started")).toBeInTheDocument();
	});

	it("renders the hero section with title, subtitle, and buttons", () => {
		expect(screen.getByText("Plan Perfect Events")).toBeInTheDocument();
		expect(
			screen.getByText(
				"Connect vendors, administrators, and event planners in one elegant platform. Create unforgettable experiences with cutting-edge tools and seamless collaboration."
			)
		).toBeInTheDocument();
		expect(screen.getByText("Start Planning")).toBeInTheDocument();
		expect(screen.getByText("Learn More")).toBeInTheDocument();
	});

	it("renders the roles section with cards for planners, vendors, and administrators", () => {
		expect(screen.getByText("Built For Every Role")).toBeInTheDocument();
		expect(screen.getByText("Event Planners")).toBeInTheDocument();
		expect(screen.getByText("Vendors")).toBeInTheDocument();
		expect(screen.getByText("Administrators")).toBeInTheDocument();
	});

	// Functionality tests
	it('navigates to the login page when "Get Started" is clicked', () => {
		fireEvent.click(screen.getByText("Get Started"));
		expect(mockNavigate).toHaveBeenCalledWith("/login");
	});

	it('navigates to the login page when "Sign In" is clicked', () => {
		fireEvent.click(screen.getByText("Sign In"));
		expect(mockNavigate).toHaveBeenCalledWith("/login");
	});

	it('navigates to the login page when "Start Planning" is clicked', () => {
		fireEvent.click(screen.getByText("Start Planning"));
		expect(mockNavigate).toHaveBeenCalledWith("/login");
	});

	it("navigates to the login page when a role card button is clicked", () => {
		fireEvent.click(screen.getByText("Get Started as an Event Planner"));
		expect(mockNavigate).toHaveBeenCalledWith("/login");

		fireEvent.click(screen.getByText("Get Started as a Vendor"));
		expect(mockNavigate).toHaveBeenCalledWith("/login");

		fireEvent.click(screen.getByText("Get Started as an Administrator"));
		expect(mockNavigate).toHaveBeenCalledWith("/login");
	});

	it("simulates smooth scrolling when a navigation link is clicked", () => {
		const featuresLink = screen.getByText("Features");
		const mockFeaturesSection = document.createElement("section");
		mockFeaturesSection.id = "features";
		document.body.appendChild(mockFeaturesSection);

		fireEvent.click(featuresLink);
		expect(
			window.HTMLElement.prototype.scrollIntoView
		).toHaveBeenCalledWith({
			behavior: "smooth",
		});
	});
});
