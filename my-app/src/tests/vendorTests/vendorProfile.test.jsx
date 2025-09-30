import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, beforeEach, afterEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { getAuth } from 'firebase/auth';

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock Firebase auth
const mockGetIdToken = vi.fn(() => Promise.resolve('mock-token'));
const mockOnAuthStateChanged = vi.fn();

// Create mock user
const mockUser = {
  uid: 'test-vendor',
  getIdToken: mockGetIdToken,
};

beforeEach(() => {
  mockNavigate.mockClear();
  global.fetch.mockClear();
  global.confirm = vi.fn(() => true);
  
  // Reset auth mocks with default implementation
  mockGetIdToken.mockResolvedValue('mock-token');
  mockOnAuthStateChanged.mockImplementation((callback) => {
    callback(mockUser);
    return vi.fn(); // unsubscribe function
  });
  
  // Mock getAuth to return our mock auth object
  vi.mocked(getAuth).mockReturnValue({
    currentUser: mockUser,
    onAuthStateChanged: mockOnAuthStateChanged,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Import component AFTER all mocks
import VendorProfile from "../../pages/vendor/vendorProfile";


describe('vendorProfile', () => {
  const mockVendorData = {
    businessName: 'Test Vendor',
    category: 'Catering',
    description: 'Quality catering services',
    address: '123 Street',
    phone: '0123456789',
    email: 'test@vendor.com',
    bookings: 10,
    totalReviews: 5,
    avgRating: 4.5,
    profilePic: 'https://example.com/profile.jpg',
  };

  const mockServicesData = [
    {
      id: 'service1',
      serviceName: 'Buffet',
      cost: '500',
      chargeByHour: '50',
      chargePerPerson: '25',
      chargePerSquareMeter: '10',
      extraNotes: 'Includes setup',
    },
  ];

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <VendorProfile />
      </MemoryRouter>
    );
  };

  const setupSuccessfulFetches = (vendorData = mockVendorData, servicesData = mockServicesData) => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(vendorData),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(servicesData),
      });
  };

  it('renders loading state initially', () => {
    setupSuccessfulFetches();
    
    renderComponent();
    
    expect(screen.getByText(/Loading your profile and services/i)).toBeInTheDocument();
  });

  it('renders no profile found when API returns null vendor', async () => {
    setupSuccessfulFetches(null, []);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/No vendor profile found/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('renders vendor profile with data from API', async () => {
    setupSuccessfulFetches();

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test Vendor')).toBeInTheDocument();
      expect(screen.getByText('Catering')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('handles authentication errors gracefully', async () => {
    // Override to simulate unauthenticated user
    mockOnAuthStateChanged.mockImplementation((callback) => {
      callback(null);
      return vi.fn();
    });

    setupSuccessfulFetches();

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/User not authenticated/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  // Service Management Tests - FIXED
  it('submits service form with valid data', async () => {
    setupSuccessfulFetches(mockVendorData, []);
    
    // Mock the service creation response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ serviceId: 'new-service-1' }),
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test Vendor')).toBeInTheDocument();
    });
    
    // Open the add service modal
    const addServiceButton = screen.getByRole('button', { name: /Add Service/i });
    fireEvent.click(addServiceButton);

    // Wait for modal to open and verify
    await waitFor(() => {
      expect(screen.getByText(/Add New Service/i)).toBeInTheDocument();
    });

    // Now query for elements within the modal context
    const modal = screen.getByText(/Add New Service/i).closest('.modal-content');
    
    // Fill out the form - these inputs should be unique to the modal
    const serviceNameInput = screen.getByPlaceholderText(/e.g., Catering, Photography/i);
    const baseCostInput = screen.getByPlaceholderText(/e.g., 10000/i);

    fireEvent.change(serviceNameInput, { 
      target: { value: 'Premium Catering' } 
    });
    fireEvent.change(baseCostInput, { 
      target: { value: '1500' } 
    });

    // Submit the form - get the button specifically from the modal
    const modalSaveButton = within(modal).getByRole('button', { name: /Add Service/i });
    fireEvent.click(modalSaveButton);

    // Verify API was called correctly
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/vendors/test-vendor/services'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-token',
          }),
        })
      );
    });
  });

  it('deletes a service after confirmation', async () => {
    setupSuccessfulFetches();

    // Mock the delete response - pay attention to the order
    global.fetch
      .mockResolvedValueOnce({ // This handles the delete call
        ok: true,
        json: () => Promise.resolve({}),
      })
      .mockResolvedValueOnce({ // This handles the subsequent services refresh
        ok: true,
        json: () => Promise.resolve([]),
      });

    renderComponent();

    // Wait for service to render
    await waitFor(() => {
      expect(screen.getByText('Buffet')).toBeInTheDocument();
    });

    // Click delete button
    const deleteButton = screen.getByRole('button', { name: /Delete/i });
    fireEvent.click(deleteButton);

    // Verify the correct API was called
    await waitFor(() => {
      // Check that a DELETE call was made to the specific service endpoint
      const deleteCall = global.fetch.mock.calls.find(call => 
        call[0].includes('/vendors/test-vendor/services/service1') && 
        call[1]?.method === 'DELETE'
      );
      expect(deleteCall).toBeTruthy();
    });
  });

  // Form Validation Tests - FIXED
  it('validates service form fields show errors for invalid data', async () => {
    setupSuccessfulFetches(mockVendorData, []);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test Vendor')).toBeInTheDocument();
    });
    
    // Open modal and try to submit empty form
    fireEvent.click(screen.getByRole('button', { name: /Add Service/i }));

    await waitFor(() => {
      expect(screen.getByText(/Add New Service/i)).toBeInTheDocument();
    });

    // Get the modal context for the submit button
    const modal = screen.getByText(/Add New Service/i).closest('.modal-content');
    const modalSubmitButton = within(modal).getByRole('button', { name: /Add Service/i });
    
    fireEvent.click(modalSubmitButton);

    // Check for validation errors
    await waitFor(() => {
      expect(screen.getByText(/Service name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Base cost is required/i)).toBeInTheDocument();
    });
  });

  it('handles services without IDs properly', async () => {
    const servicesWithoutIds = [
      { 
        serviceName: 'Service Without ID', 
        cost: '300',
        extraNotes: 'This service has no ID' 
      },
    ];

    setupSuccessfulFetches(mockVendorData, servicesWithoutIds);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Service Without ID')).toBeInTheDocument();
      expect(screen.getByText(/Warning: This service is missing an ID/i)).toBeInTheDocument();
    });

    // Edit and Delete buttons should be disabled
    const editButtons = screen.getAllByRole('button', { name: /Edit/i });
    const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
    
    expect(editButtons.some(btn => btn.disabled)).toBe(true);
    expect(deleteButtons.some(btn => btn.disabled)).toBe(true);
  });

  // User Interaction Tests
  it('handles service form cancellation', async () => {
    setupSuccessfulFetches(mockVendorData, []);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test Vendor')).toBeInTheDocument();
    });
    
    // Open and then close the modal
    fireEvent.click(screen.getByRole('button', { name: /Add Service/i }));

    await waitFor(() => {
      expect(screen.getByText(/Add New Service/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

    // Modal should be closed
    await waitFor(() => {
      expect(screen.queryByText(/Add New Service/i)).not.toBeInTheDocument();
    });
  });

  it('displays error message when service save fails', async () => {
    setupSuccessfulFetches(mockVendorData, []);

    // Mock failed service creation
    global.fetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Bad Request',
      json: () => Promise.resolve({ error: 'Failed to save service' }),
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test Vendor')).toBeInTheDocument();
    });
    
    // Open modal, fill and submit form
    fireEvent.click(screen.getByRole('button', { name: /Add Service/i }));

    await waitFor(() => {
      expect(screen.getByText(/Add New Service/i)).toBeInTheDocument();
    });

    // Get modal context for form interaction
    const modal = screen.getByText(/Add New Service/i).closest('.modal-content');
    
    fireEvent.change(screen.getByPlaceholderText(/e.g., Catering, Photography/i), { 
      target: { value: 'Test Service' } 
    });
    fireEvent.change(screen.getByPlaceholderText(/e.g., 10000/i), { 
      target: { value: '100' } 
    });

    const modalSubmitButton = within(modal).getByRole('button', { name: /Add Service/i });
    fireEvent.click(modalSubmitButton);

    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/Failed to save service/i)).toBeInTheDocument();
    });
  });

  // API Error Handling Tests
  it('handles API errors when fetching services', async () => {
    // Mock successful vendor fetch but failed services fetch
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVendorData),
      })
      .mockRejectedValueOnce(new Error('Services API down'));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Services API down/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  // UI Content Verification Tests
  it('displays all vendor stats correctly', async () => {
    const vendorWithStats = {
      ...mockVendorData,
      bookings: 25,
      totalReviews: 15,
      avgRating: 4.8,
    };

    setupSuccessfulFetches(vendorWithStats, mockServicesData);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('25')).toBeInTheDocument(); // bookings
      expect(screen.getByText('15')).toBeInTheDocument(); // reviews  
      expect(screen.getByText('4.8★')).toBeInTheDocument(); // rating
      expect(screen.getByText('1')).toBeInTheDocument(); // services count from mockServicesData
    });
  });

  // Navigation Tests
  it('navigates to edit profile when edit button is clicked', async () => {
    setupSuccessfulFetches();

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test Vendor')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByRole('button', { name: /Edit Profile/i }));
    
    expect(mockNavigate).toHaveBeenCalledWith('/vendor/vendor-edit-profile');
  });

  // Additional test for editing an existing service - FIXED
  it('edits an existing service', async () => {
    setupSuccessfulFetches();

    // Mock the service update response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ serviceId: 'service1' }),
    });

    renderComponent();

    // Wait for service to be rendered
    await waitFor(() => {
      expect(screen.getByText('Buffet')).toBeInTheDocument();
    });

    // Find and click the specific edit button for the service
    const editButtons = screen.getAllByRole('button', { name: /Edit/i });
    const serviceEditButton = editButtons.find(button => 
      button.closest('.service-item') !== null
    );
    
    expect(serviceEditButton).toBeDefined();
    fireEvent.click(serviceEditButton);

    // Wait for modal to open - use a more specific check
    await waitFor(() => {
      // Check that the modal is open by looking for the heading
      const modalTitle = screen.getByRole('heading', { name: /Edit Service/i });
      expect(modalTitle).toBeInTheDocument();
    });

    // Get the modal context for more specific queries
    const modal = screen.getByRole('heading', { name: /Edit Service/i }).closest('.modal-content');
    
    // Verify form is populated with existing data - query within modal context
    const serviceNameInput = within(modal).getByPlaceholderText(/e.g., Catering, Photography/i);
    expect(serviceNameInput.value).toBe('Buffet');

    // Update the service
    fireEvent.change(serviceNameInput, { 
      target: { value: 'Updated Buffet Service' } 
    });

    // Submit the update - use the specific button in the modal
    const updateButton = within(modal).getByRole('button', { name: /Update Service/i });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/vendors/test-vendor/services'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Updated Buffet Service'),
        })
      );
    });
  });

  // Test for form validation with invalid numeric values - FIXED
  it('handles form validation for numeric fields', async () => {
    setupSuccessfulFetches(mockVendorData, []);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test Vendor')).toBeInTheDocument();
    });
    
    // Open add service modal
    const addServiceButton = screen.getByRole('button', { name: /Add Service/i });
    fireEvent.click(addServiceButton);

    await waitFor(() => {
      expect(screen.getByText(/Add New Service/i)).toBeInTheDocument();
    });

    // Get modal context for specific queries
    const modal = screen.getByText(/Add New Service/i).closest('.modal-content');
    
    // Fill with invalid data - use within(modal) to scope queries and exact placeholder text
    const serviceNameInput = within(modal).getByPlaceholderText(/e.g., Catering, Photography/i);
    const baseCostInput = within(modal).getByPlaceholderText('e.g., 10000'); // Exact match
    const hourlyInput = within(modal).getByPlaceholderText('e.g., 1000'); // Exact match

    fireEvent.change(serviceNameInput, { target: { value: '123' } }); // Only numbers
    fireEvent.change(baseCostInput, { target: { value: '-100' } }); // Negative
    fireEvent.change(hourlyInput, { target: { value: 'abc' } }); // Non-numeric

    // Submit form within modal context
    const modalSubmitButton = within(modal).getByRole('button', { name: /Add Service/i });
    fireEvent.click(modalSubmitButton);

    // Check for validation errors
    await waitFor(() => {
      expect(screen.getByText(/Service name must contain at least one letter/i)).toBeInTheDocument();
      expect(screen.getByText(/Base cost must be a valid positive number/i)).toBeInTheDocument();
      //expect(screen.getByText(/Charge by hour must be a valid positive number/i)).toBeInTheDocument();
    });
  });

  // Additional test for checking service item display
  it('displays service details correctly', async () => {
    setupSuccessfulFetches();

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Buffet')).toBeInTheDocument();
      expect(screen.getByText('Cost: R500')).toBeInTheDocument();
      expect(screen.getByText('Per Hour: R50')).toBeInTheDocument();
      expect(screen.getByText('Per Person: R25')).toBeInTheDocument();
      expect(screen.getByText('Per m²: R10')).toBeInTheDocument();
      expect(screen.getByText('Notes: Includes setup')).toBeInTheDocument();
    });
  });

  // Test for empty services state
  it('displays empty state when no services', async () => {
    setupSuccessfulFetches(mockVendorData, []);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('No services added yet.')).toBeInTheDocument();
    });
  });

  // Test for vendor profile with missing data
  it('handles vendor profile with missing data gracefully', async () => {
    const incompleteVendorData = {
      businessName: 'Test Vendor',
      // Missing other fields
    };

    setupSuccessfulFetches(incompleteVendorData, []);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test Vendor')).toBeInTheDocument();
      expect(screen.getByText('Uncategorized')).toBeInTheDocument(); // Default category
      expect(screen.getByText('No description provided.')).toBeInTheDocument();
    });
  });
});