import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the API module
jest.mock('../../api/webauthn.js', () => ({
  getMe: jest.fn(),
  getRegistrationOptions: jest.fn(),
  verifyRegistration: jest.fn(),
  getAuthenticationOptions: jest.fn(),
  verifyAuthentication: jest.fn(),
  logout: jest.fn(),
  deleteCredential: jest.fn(),
}));

// Mock @simplewebauthn/browser (cannot run in jsdom)
jest.mock('@simplewebauthn/browser', () => ({
  startRegistration: jest.fn(),
  startAuthentication: jest.fn(),
}));

// FlowDiagram adds complexity without value in App-level tests
jest.mock('../../components/FlowDiagram.jsx', () => ({
  FlowDiagram: () => null,
}));

import * as api from '../../api/webauthn.js';
import App from '../../App.jsx';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('App', () => {
  // On first render, before getMe resolves, the app should show a loading spinner
  it('shows a loading indicator initially', () => {
    api.getMe.mockReturnValue(new Promise(() => {}));
    render(<App />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  // If getMe returns a non-ok response, the user is not logged in and should see the login form
  it('shows LoginForm when user is not authenticated', async () => {
    api.getMe.mockResolvedValue({ ok: false, error: 'Not authenticated' });
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /login with biometric/i })).toBeInTheDocument();
    });
  });

  // If getMe returns a user, we're already authenticated and the dashboard should show
  it('shows Dashboard when user is authenticated', async () => {
    api.getMe.mockResolvedValue({
      ok: true,
      data: {
        user: { id: 'user-1', username: 'alice', createdAt: '2024-01-01T00:00:00Z' },
        credentials: [],
      },
    });
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('alice')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    });
  });

  // Clicking "Create one" from the login form should swap in the registration form
  it('switches from LoginForm to RegisterForm when Create one is clicked', async () => {
    const user = userEvent.setup();
    api.getMe.mockResolvedValue({ ok: false, error: 'Not authenticated' });
    render(<App />);
    await waitFor(() => screen.getByRole('button', { name: /create one/i }));
    await user.click(screen.getByRole('button', { name: /create one/i }));
    expect(screen.getByRole('button', { name: /register with biometric/i })).toBeInTheDocument();
  });

  // Clicking "Sign in" from the registration form should swap back to the login form
  it('switches back to LoginForm when Sign in is clicked from RegisterForm', async () => {
    const user = userEvent.setup();
    api.getMe.mockResolvedValue({ ok: false, error: 'Not authenticated' });
    render(<App />);
    await waitFor(() => screen.getByRole('button', { name: /create one/i }));
    await user.click(screen.getByRole('button', { name: /create one/i }));
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(screen.getByRole('button', { name: /login with biometric/i })).toBeInTheDocument();
  });
});
