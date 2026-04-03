import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock AuthContext so we control the values without running real auth
jest.mock('../../context/AuthContext.jsx', () => ({
  useAuth: jest.fn(),
}));

// FlowDiagram renders null at idle, no need to mock
jest.mock('../../components/FlowDiagram.jsx', () => ({
  FlowDiagram: () => null,
}));

import { useAuth } from '../../context/AuthContext.jsx';
import { RegisterForm } from '../../components/RegisterForm.jsx';

function makeAuth(overrides = {}) {
  return {
    register: jest.fn(),
    step: 'idle',
    error: null,
    clearError: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('RegisterForm', () => {
  // The form needs a text input for the username and a submit button to kick off registration
  it('renders username input and submit button', () => {
    useAuth.mockReturnValue(makeAuth());
    render(<RegisterForm onSwitchToLogin={jest.fn()} />);
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register with biometric/i })).toBeInTheDocument();
  });

  // The submit button should be disabled until the user has typed something
  it('disables submit button when username is empty', () => {
    useAuth.mockReturnValue(makeAuth());
    render(<RegisterForm onSwitchToLogin={jest.fn()} />);
    expect(screen.getByRole('button', { name: /register/i })).toBeDisabled();
  });

  // Typing a two-character username and submitting should show a "too short" error inline
  it('shows validation error for username shorter than 3 chars', async () => {
    const user = userEvent.setup();
    useAuth.mockReturnValue(makeAuth());
    render(<RegisterForm onSwitchToLogin={jest.fn()} />);
    await user.type(screen.getByLabelText('Username'), 'ab');
    await user.click(screen.getByRole('button', { name: /register/i }));
    expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument();
  });

  // Typing special characters should trigger the "letters, numbers, underscores only" error
  it('shows validation error for invalid characters', async () => {
    const user = userEvent.setup();
    useAuth.mockReturnValue(makeAuth());
    render(<RegisterForm onSwitchToLogin={jest.fn()} />);
    await user.type(screen.getByLabelText('Username'), 'alice@domain');
    await user.click(screen.getByRole('button', { name: /register/i }));
    expect(screen.getByText(/only letters, numbers/i)).toBeInTheDocument();
  });

  // A valid submission should call register with the username, trimmed of any whitespace
  it('calls register with trimmed username on valid submit', async () => {
    const user = userEvent.setup();
    const register = jest.fn();
    useAuth.mockReturnValue(makeAuth({ register }));
    render(<RegisterForm onSwitchToLogin={jest.fn()} />);
    await user.type(screen.getByLabelText('Username'), 'alice');
    await user.click(screen.getByRole('button', { name: /register/i }));
    expect(register).toHaveBeenCalledWith('alice');
  });

  // Clicking "Sign in" should hand control back to the parent to swap the form
  it('calls onSwitchToLogin when Sign in link is clicked', async () => {
    const user = userEvent.setup();
    const onSwitchToLogin = jest.fn();
    useAuth.mockReturnValue(makeAuth());
    render(<RegisterForm onSwitchToLogin={onSwitchToLogin} />);
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(onSwitchToLogin).toHaveBeenCalled();
  });

  // When the context reports an error it should be visible to the user in the form
  it('displays error message from context', () => {
    useAuth.mockReturnValue(makeAuth({ error: 'Something went wrong', step: 'error' }));
    render(<RegisterForm onSwitchToLogin={jest.fn()} />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  // While a request is in flight the input and button should be disabled and show "Processing…"
  it('disables input and shows processing state while loading', () => {
    useAuth.mockReturnValue(makeAuth({ step: 'requesting' }));
    render(<RegisterForm onSwitchToLogin={jest.fn()} />);
    expect(screen.getByLabelText('Username')).toBeDisabled();
    expect(screen.getByText('Processing…')).toBeInTheDocument();
  });
});
