// src/test-setup.js
import { vi } from 'vitest';
import '@testing-library/jest-dom'; // Extends expect with DOM matchers

// Initialize jsdom (optional, as Vitest's jsdom should suffice)
import { JSDOM } from 'jsdom';
const jsdom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/5173',
});
global.window = jsdom.window;
global.document = jsdom.window.document;
global.navigator = jsdom.window.navigator;
global.alert = vi.fn(); // Mock alert for Home.test.jsx
global.fetch = vi.fn(); // Mock fetch for Home.test.jsx

// Mock Firebase modules
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
  getApp: vi.fn(() => ({})),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    currentUser: null, // Default: no user
  })),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
}));

vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(() => ({})),
}));

vi.mock('firebase/analytics', () => ({
  getAnalytics: vi.fn(() => ({})),
}));