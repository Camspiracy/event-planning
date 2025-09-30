import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, beforeEach, afterEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import Home from '../pages/Home';

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

beforeEach(() => {
  mockNavigate.mockClear();
  global.fetch.mockClear();
  vi.mocked(getAuth).mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Home Page', () => {
  it('renders all role tiles and key elements', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByText('Welcome to PLANiT')).toBeInTheDocument();
    expect(
      screen.getByText(/The complete platform for event planning/i)
    ).toBeInTheDocument();
    expect(screen.getByText('Choose your experience')).toBeInTheDocument();
    expect(
      screen.getByText('Trusted by Event Organisers')
    ).toBeInTheDocument();

    expect(screen.getByText('Event Manager')).toBeInTheDocument();
    expect(screen.getByText('Vendor')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();

    expect(
      screen.getByText('Event creation & management')
    ).toBeInTheDocument();
    expect(screen.getByText('Business profile management')).toBeInTheDocument();
    expect(screen.getByText('User profile management')).toBeInTheDocument();

    expect(screen.getByText('Logout')).toBeInTheDocument();
    expect(
      screen.getAllByText(/Enter Event Dashboard/i)[0]
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/Enter Vendor Dashboard/i)[0]
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/Enter Admin Dashboard/i)[0]
    ).toBeInTheDocument();

    expect(
      screen.getByText('© 2025 PLANiT. All rights reserved.')
    ).toBeInTheDocument();
  });

 

  it('navigates to admin dashboard when Admin button is clicked', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    fireEvent.click(screen.getAllByText(/Enter Admin Dashboard/i)[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/admin');
  });

  it('navigates to home when Logout button is clicked', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Logout'));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  describe('Vendor Apply Flow', () => {
    it('navigates to vendor-apply if no status', async () => {
      vi.mocked(getAuth).mockReturnValue({
        currentUser: {
          getIdToken: vi.fn().mockResolvedValue('fake-token'),
        },
      });

      global.fetch.mockResolvedValue({
        json: () => Promise.resolve({}),
      });

      render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      );

      fireEvent.click(screen.getAllByText(/Enter Vendor Dashboard/i)[0]);

      await waitFor(
        () => {
          expect(mockNavigate).toHaveBeenCalledWith('/vendor/vendor-apply');
        },
        { timeout: 2000 }
      );
    });

    it('navigates to vendor-apply if status is rejected', async () => {
      vi.mocked(getAuth).mockReturnValue({
        currentUser: {
          getIdToken: vi.fn().mockResolvedValue('fake-token'),
        },
      });

      global.fetch.mockResolvedValue({
        json: () => Promise.resolve({ status: 'rejected' }),
      });

      render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      );

      fireEvent.click(screen.getAllByText(/Enter Vendor Dashboard/i)[0]);

      await waitFor(
        () => {
          expect(mockNavigate).toHaveBeenCalledWith('/vendor/vendor-apply');
        },
        { timeout: 2000 }
      );
    });

    it('navigates to waiting if status is pending', async () => {
      vi.mocked(getAuth).mockReturnValue({
        currentUser: {
          getIdToken: vi.fn().mockResolvedValue('fake-token'),
        },
      });

      global.fetch.mockResolvedValue({
        json: () => Promise.resolve({ status: 'pending' }),
      });

      render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      );

      fireEvent.click(screen.getAllByText(/Enter Vendor Dashboard/i)[0]);

      await waitFor(
        () => {
          expect(mockNavigate).toHaveBeenCalledWith('/vendor/waiting');
        },
        { timeout: 2000 }
      );
    });

    it('navigates to vendor-app if status is approved', async () => {
      vi.mocked(getAuth).mockReturnValue({
        currentUser: {
          getIdToken: vi.fn().mockResolvedValue('fake-token'),
        },
      });

      global.fetch.mockResolvedValue({
        json: () => Promise.resolve({ status: 'approved' }),
      });

      render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      );

      fireEvent.click(screen.getAllByText(/Enter Vendor Dashboard/i)[0]);

      await waitFor(
        () => {
          expect(mockNavigate).toHaveBeenCalledWith('/vendor-app');
        },
        { timeout: 2000 }
      );
    });
  });
});