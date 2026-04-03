import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('../../context/AuthContext.jsx', () => ({
  useAuth: jest.fn(),
}));

import { useAuth } from '../../context/AuthContext.jsx';
import { Dashboard } from '../../components/Dashboard.jsx';

const USER = { id: 'user-1234-5678', username: 'alice', createdAt: '2024-01-15T00:00:00Z' };
const CRED = {
  id: 'abcdef1234567890xyz',
  deviceType: 'platform',
  backedUp: false,
  transports: ['internal'],
  createdAt: '2024-01-15T00:00:00Z',
};

function makeAuth(overrides = {}) {
  return {
    user: USER,
    credentials: [CRED],
    logout: jest.fn(),
    removeCredential: jest.fn(),
    error: null,
    clearError: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Dashboard', () => {
  // If the user is null (not authenticated), the dashboard should render nothing at all
  it('renders nothing when user is null', () => {
    useAuth.mockReturnValue(makeAuth({ user: null }));
    const { container } = render(<Dashboard />);
    expect(container.firstChild).toBeNull();
  });

  // The signed-in user's username should be prominently visible on the dashboard
  it('displays the username', () => {
    useAuth.mockReturnValue(makeAuth());
    render(<Dashboard />);
    expect(screen.getByText('alice')).toBeInTheDocument();
  });

  // A single credential should show "1 key" in the badge
  it('displays credential count badge', () => {
    useAuth.mockReturnValue(makeAuth());
    render(<Dashboard />);
    expect(screen.getByText('1 key')).toBeInTheDocument();
  });

  // Two or more credentials should use the plural "keys" form
  it('displays "keys" for multiple credentials', () => {
    useAuth.mockReturnValue(makeAuth({ credentials: [CRED, { ...CRED, id: 'cred-2222222222222222' }] }));
    render(<Dashboard />);
    expect(screen.getByText('2 keys')).toBeInTheDocument();
  });

  // When there's an error (e.g. delete failed) a red banner should appear with the message
  it('shows error banner when error is set', () => {
    useAuth.mockReturnValue(makeAuth({ error: 'Something failed' }));
    render(<Dashboard />);
    expect(screen.getByText('Something failed')).toBeInTheDocument();
  });

  // Clicking the ✕ on the error banner should call clearError to dismiss it
  it('calls clearError when dismiss button is clicked', async () => {
    const user = userEvent.setup();
    const clearError = jest.fn();
    useAuth.mockReturnValue(makeAuth({ error: 'Oops', clearError }));
    render(<Dashboard />);
    const buttons = screen.getAllByRole('button');
    const dismissBtn = buttons.find(b => b.textContent === '✕' && b.closest('[class*="red"]'));
    await user.click(dismissBtn);
    expect(clearError).toHaveBeenCalled();
  });

  // Clicking "Sign Out" should call the logout function from the auth context
  it('calls logout when Sign Out button is clicked', async () => {
    const user = userEvent.setup();
    const logout = jest.fn();
    useAuth.mockReturnValue(makeAuth({ logout }));
    render(<Dashboard />);
    await user.click(screen.getByRole('button', { name: /sign out/i }));
    expect(logout).toHaveBeenCalled();
  });

  // The footer should show the join date and the first few characters of the user id
  it('shows joined date and truncated user id', () => {
    useAuth.mockReturnValue(makeAuth());
    render(<Dashboard />);
    expect(screen.getByText(/joined/i)).toBeInTheDocument();
    expect(screen.getByText(/ID: user-123…/i)).toBeInTheDocument();
  });
});
