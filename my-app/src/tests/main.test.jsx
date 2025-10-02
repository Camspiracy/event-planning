import React from "react";

// Mock the 'react-dom/client' module
const mockRender = vi.fn();
const mockCreateRoot = vi.fn(() => ({
	render: mockRender,
}));
vi.mock("react-dom/client", () => ({
	createRoot: mockCreateRoot,
}));

// Mock the App component to isolate the test to main.jsx
vi.mock("/src/App.jsx", () => {
	const MockApp = () => (
		<div data-testid="app-component">Mocked App Component</div>
	);
	MockApp.displayName = "MockApp";
	return { default: MockApp };
});

describe("main.jsx", () => {
	let rootElement;

	beforeEach(() => {
		// Set up a div with id 'root' in the document body before each test
		rootElement = document.createElement("div");
		rootElement.id = "root";
		document.body.appendChild(rootElement);
	});

	afterEach(() => {
		// Clean up the DOM and mocks after each test
		if (rootElement) {
			document.body.removeChild(rootElement);
		}
		rootElement = null;
		vi.clearAllMocks();
		vi.resetModules(); // Reset module cache to allow re-importing main.jsx
	});

	it("should get the root element and call createRoot with it", async () => {
		// Dynamically import main.jsx to execute its code within this test's context
		// This is necessary because main.jsx runs its code on import.
		await import("/src/main.jsx");

		// Verify that createRoot was called with the correct DOM element
		expect(mockCreateRoot).toHaveBeenCalledTimes(1);
		expect(mockCreateRoot).toHaveBeenCalledWith(rootElement);
	});

	it("should call the render function on the created root", async () => {
		await import("/src/main.jsx");

		// Verify that the render function was called
		expect(mockRender).toHaveBeenCalledTimes(1);
	});

	it("should render the App component wrapped in StrictMode", async () => {
		await import("/src/main.jsx");

		// Get the JSX element that was passed to the render function
		const renderedArgument = mockRender.mock.calls[0][0];

		// Check if the top-level component is React.StrictMode
		expect(renderedArgument.type).toBe(React.StrictMode);

		// Check if the child of StrictMode is our mocked App component by its display name
		const appComponent = renderedArgument.props.children;
		expect(appComponent.type.displayName).toBe("MockApp");
	});

	it('ensures document.getElementById is called with "root"', async () => {
		const getElementByIdSpy = vi.spyOn(document, "getElementById");

		await import("/src/main.jsx");

		expect(getElementByIdSpy).toHaveBeenCalledWith("root");

		// Clean up the spy
		getElementByIdSpy.mockRestore();
	});
});
