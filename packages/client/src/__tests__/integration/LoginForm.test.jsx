import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('../../context/AuthContext.jsx', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../components/FlowDiagram.jsx', () => ({
  FlowDiagram: () => null,
}));

import { useAuth } from '../../context/AuthContext.jsx';
import { LoginForm } from '../../components/LoginForm.jsx';

function makeAuth(overrides = {}) {
  return {
    login: jest.fn(),
    step: 'idle',
    error: null,
    clearError: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('LoginForm', () => {
  // The login form needs a username input and a button to kick off the biometric prompt
  it('renders username input and login button', () => {
    useAuth.mockReturnValue(makeAuth());
    render(<LoginForm onSwitchToRegister={jest.fn()} />);
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login with biometric/i })).toBeInTheDocument();
  });

  // Without a username typed in, the login button should do nothing and stay disabled
  it('disables submit button when username is empty', () => {
    useAuth.mockReturnValue(makeAuth());
    render(<LoginForm onSwitchToRegister={jest.fn()} />);
    expect(screen.getByRole('button', { name: /login/i })).toBeDisabled();
  });

  // A valid username submission should invoke login with the trimmed value
  it('calls login with trimmed username on submit', async () => {
    const user = userEvent.setup();
    const login = jest.fn();
    useAuth.mockReturnValue(makeAuth({ login }));
    render(<LoginForm onSwitchToRegister={jest.fn()} />);
    await user.type(screen.getByLabelText('Username'), 'alice');
    await user.click(screen.getByRole('button', { name: /login/i }));
    expect(login).toHaveBeenCalledWith('alice');
  });

  // Clicking "Create one" should hand control to the parent to show the register form
  it('calls onSwitchToRegister when Create one link is clicked', async () => {
    const user = userEvent.setup();
    const onSwitchToRegister = jest.fn();
    useAuth.mockReturnValue(makeAuth());
    render(<LoginForm onSwitchToRegister={onSwitchToRegister} />);
    await user.click(screen.getByRole('button', { name: /create one/i }));
    expect(onSwitchToRegister).toHaveBeenCalled();
  });

  // If login fails the error from the context should appear in the form for the user to see
  it('displays error message from context', () => {
    useAuth.mockReturnValue(makeAuth({ error: 'Login failed', step: 'error' }));
    render(<LoginForm onSwitchToRegister={jest.fn()} />);
    expect(screen.getByText('Login failed')).toBeInTheDocument();
  });

  // While the request is in flight the input should be locked and "Processing…" should appear
  it('disables input and shows processing state while loading', () => {
    useAuth.mockReturnValue(makeAuth({ step: 'verifying' }));
    render(<LoginForm onSwitchToRegister={jest.fn()} />);
    expect(screen.getByLabelText('Username')).toBeDisabled();
    expect(screen.getByText('Processing…')).toBeInTheDocument();
  });
});
