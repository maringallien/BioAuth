import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('../../api/webauthn.js', () => ({
  getMe: jest.fn(),
  getRegistrationOptions: jest.fn(),
  verifyRegistration: jest.fn(),
  getAuthenticationOptions: jest.fn(),
  verifyAuthentication: jest.fn(),
  logout: jest.fn(),
  deleteCredential: jest.fn(),
}));

jest.mock('@simplewebauthn/browser', () => ({
  startRegistration: jest.fn(),
  startAuthentication: jest.fn(),
}));

import * as api from '../../api/webauthn.js';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { AuthProvider, useAuth } from '../../context/AuthContext.jsx';

// Simple test component that exposes auth state and actions
function TestConsumer({ action, actionArgs }) {
  const { user, credentials, loading, step, error, register, login, logout, removeCredential, clearError } = useAuth();
  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="step">{step}</div>
      <div data-testid="user">{user ? user.username : 'null'}</div>
      <div data-testid="error">{error ?? 'null'}</div>
      <div data-testid="cred-count">{credentials.length}</div>
      <button onClick={() => register('alice')}>register</button>
      <button onClick={() => login('alice')}>login</button>
      <button onClick={() => logout()}>logout</button>
      <button onClick={() => credentials[0] && removeCredential(credentials[0].id)}>remove</button>
      <button onClick={() => clearError()}>clear</button>
    </div>
  );
}

function renderWithAuth() {
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>
  );
}

const USER = { id: 'u1', username: 'alice', createdAt: '2024-01-01T00:00:00Z' };
const CRED = { id: 'cred-1', deviceType: 'platform', backedUp: false, transports: [], createdAt: '2024-01-01T00:00:00Z' };
const CRED_2 = { id: 'cred-2', deviceType: 'platform', backedUp: false, transports: [], createdAt: '2024-01-02T00:00:00Z' };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AuthProvider initialization', () => {
  // Right after mount, before getMe has resolved, the loading flag should be true
  it('starts in loading state', () => {
    api.getMe.mockReturnValue(new Promise(() => {}));
    renderWithAuth();
    expect(screen.getByTestId('loading').textContent).toBe('true');
  });

  // When getMe returns a user, the context should populate user and credentials and clear loading
  it('sets user and credentials when getMe succeeds', async () => {
    api.getMe.mockResolvedValue({ ok: true, data: { user: USER, credentials: [CRED] } });
    renderWithAuth();
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
      expect(screen.getByTestId('user').textContent).toBe('alice');
      expect(screen.getByTestId('cred-count').textContent).toBe('1');
    });
  });

  // When getMe fails (e.g. not logged in), user should stay null and loading should clear
  it('stays with null user when getMe fails', async () => {
    api.getMe.mockResolvedValue({ ok: false, error: 'Not authenticated' });
    renderWithAuth();
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
      expect(screen.getByTestId('user').textContent).toBe('null');
    });
  });
});

describe('register', () => {
  // Full registration flow — options, biometric prompt, verify, then load profile
  it('sets step to success and loads user profile on successful registration', async () => {
    const user = userEvent.setup();
    api.getMe.mockResolvedValue({ ok: false, error: 'Not authenticated' });
    api.getRegistrationOptions.mockResolvedValue({ ok: true, data: { challenge: 'ch' } });
    startRegistration.mockResolvedValue({ id: 'att-resp' });
    api.verifyRegistration.mockResolvedValue({ ok: true, data: { verified: true } });
    api.getMe.mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true, data: { user: USER, credentials: [CRED] } });

    renderWithAuth();
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    await user.click(screen.getByRole('button', { name: 'register' }));

    await waitFor(() => {
      expect(screen.getByTestId('step').textContent).toBe('success');
      expect(screen.getByTestId('user').textContent).toBe('alice');
    });
  });

  // If the server rejects the options request, registration should land in the error state
  it('sets step to error when getRegistrationOptions fails', async () => {
    const user = userEvent.setup();
    api.getMe.mockResolvedValue({ ok: false });
    api.getRegistrationOptions.mockResolvedValue({ ok: false, error: 'Server error' });

    renderWithAuth();
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    await user.click(screen.getByRole('button', { name: 'register' }));

    await waitFor(() => {
      expect(screen.getByTestId('step').textContent).toBe('error');
      expect(screen.getByTestId('error').textContent).toBe('Server error');
    });
  });

  // If the server verifies but says verified:false, registration should also end in error
  it('sets step to error when verifyRegistration returns verified:false', async () => {
    const user = userEvent.setup();
    api.getMe.mockResolvedValue({ ok: false });
    api.getRegistrationOptions.mockResolvedValue({ ok: true, data: { challenge: 'ch' } });
    startRegistration.mockResolvedValue({ id: 'att' });
    api.verifyRegistration.mockResolvedValue({ ok: true, data: { verified: false } });

    renderWithAuth();
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    await user.click(screen.getByRole('button', { name: 'register' }));

    await waitFor(() => {
      expect(screen.getByTestId('step').textContent).toBe('error');
    });
  });
});

describe('login', () => {
  // Full login flow — options, biometric, verify, then load profile
  it('sets step to success and loads user profile on successful login', async () => {
    const user = userEvent.setup();
    api.getMe.mockResolvedValue({ ok: false });
    api.getAuthenticationOptions.mockResolvedValue({ ok: true, data: { challenge: 'ch' } });
    startAuthentication.mockResolvedValue({ id: 'assert-resp' });
    api.verifyAuthentication.mockResolvedValue({ ok: true, data: { verified: true } });
    api.getMe.mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true, data: { user: USER, credentials: [CRED] } });

    renderWithAuth();
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    await user.click(screen.getByRole('button', { name: 'login' }));

    await waitFor(() => {
      expect(screen.getByTestId('step').textContent).toBe('success');
    });
  });

  // If the server can't find the user, login should land in the error state with the message
  it('sets step to error when getAuthenticationOptions fails', async () => {
    const user = userEvent.setup();
    api.getMe.mockResolvedValue({ ok: false });
    api.getAuthenticationOptions.mockResolvedValue({ ok: false, error: 'Not found' });

    renderWithAuth();
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    await user.click(screen.getByRole('button', { name: 'login' }));

    await waitFor(() => {
      expect(screen.getByTestId('step').textContent).toBe('error');
      expect(screen.getByTestId('error').textContent).toBe('Not found');
    });
  });
});

describe('logout', () => {
  // After logging out, the user and credentials in the context should both be cleared
  it('clears user and credentials after logout', async () => {
    const user = userEvent.setup();
    api.getMe.mockResolvedValue({ ok: true, data: { user: USER, credentials: [CRED] } });
    api.logout.mockResolvedValue({ ok: true });

    renderWithAuth();
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('alice'));

    await user.click(screen.getByRole('button', { name: 'logout' }));

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('null');
      expect(screen.getByTestId('cred-count').textContent).toBe('0');
      expect(screen.getByTestId('step').textContent).toBe('idle');
    });
  });
});

describe('removeCredential', () => {
  // Successfully deleting one of two credentials should drop the count to one
  it('removes credential from state on success', async () => {
    const user = userEvent.setup();
    api.getMe.mockResolvedValue({ ok: true, data: { user: USER, credentials: [CRED, CRED_2] } });
    api.deleteCredential.mockResolvedValue({ ok: true });

    renderWithAuth();
    await waitFor(() => expect(screen.getByTestId('cred-count').textContent).toBe('2'));

    await user.click(screen.getByRole('button', { name: 'remove' }));

    await waitFor(() => {
      expect(screen.getByTestId('cred-count').textContent).toBe('1');
    });
  });

  // If the server rejects the delete (e.g. last credential), the error should appear in the context
  it('sets error when deleteCredential fails', async () => {
    const user = userEvent.setup();
    api.getMe.mockResolvedValue({ ok: true, data: { user: USER, credentials: [CRED, CRED_2] } });
    api.deleteCredential.mockResolvedValue({ ok: false, error: 'Cannot delete last credential' });

    renderWithAuth();
    await waitFor(() => expect(screen.getByTestId('cred-count').textContent).toBe('2'));

    await user.click(screen.getByRole('button', { name: 'remove' }));

    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).toBe('Cannot delete last credential');
    });
  });
});

describe('clearError', () => {
  // After dismissing an error the error message should be gone and the step should reset to idle
  it('resets error and step to idle', async () => {
    const user = userEvent.setup();
    api.getMe.mockResolvedValue({ ok: false });
    api.getRegistrationOptions.mockResolvedValue({ ok: false, error: 'Something failed' });

    renderWithAuth();
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    await user.click(screen.getByRole('button', { name: 'register' }));
    await waitFor(() => expect(screen.getByTestId('error').textContent).toBe('Something failed'));

    await user.click(screen.getByRole('button', { name: 'clear' }));

    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).toBe('null');
      expect(screen.getByTestId('step').textContent).toBe('idle');
    });
  });
});
