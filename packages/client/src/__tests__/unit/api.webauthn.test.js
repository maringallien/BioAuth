import {
  getRegistrationOptions,
  verifyRegistration,
  getAuthenticationOptions,
  verifyAuthentication,
  getMe,
  logout,
  deleteCredential,
} from '../../api/webauthn.js';

function mockFetch(status, body, ok = null) {
  const isOk = ok !== null ? ok : status >= 200 && status < 300;
  return jest.fn().mockResolvedValue({
    ok: isOk,
    status,
    json: jest.fn().mockResolvedValue(body),
  });
}

beforeEach(() => {
  global.fetch = undefined;
});

describe('getRegistrationOptions', () => {
  // Should POST the username to the right endpoint wrapped in a JSON body
  it('calls POST /api/registration/options with username', async () => {
    global.fetch = mockFetch(200, { challenge: 'ch' });
    await getRegistrationOptions('alice');
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/registration/options',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ username: 'alice' }),
        credentials: 'include',
      })
    );
  });

  // A 200 response should come back unwrapped as { ok: true, data }
  it('returns { ok: true, data } on success', async () => {
    const data = { challenge: 'ch', rpId: 'localhost' };
    global.fetch = mockFetch(200, data);
    const result = await getRegistrationOptions('alice');
    expect(result.ok).toBe(true);
    expect(result.data).toEqual(data);
  });

  // A 4xx/5xx response should come back as { ok: false, error } using the server's error message
  it('returns { ok: false, error } on HTTP error', async () => {
    global.fetch = mockFetch(400, { error: 'Bad request' }, false);
    const result = await getRegistrationOptions('ab');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Bad request');
  });

  // If the network is down entirely, fetch throws and we should catch it gracefully
  it('returns { ok: false, error } on network error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network failure'));
    const result = await getRegistrationOptions('alice');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Network failure');
  });
});

describe('verifyRegistration', () => {
  // The browser's attestation response should be POSTed verbatim to the verify endpoint
  it('calls POST /api/registration/verify', async () => {
    global.fetch = mockFetch(200, { verified: true });
    const response = { id: 'cred-id', type: 'public-key' };
    await verifyRegistration(response);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/registration/verify',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(response),
      })
    );
  });
});

describe('getAuthenticationOptions', () => {
  // Should hit the authentication options endpoint with the provided username
  it('calls POST /api/authentication/options', async () => {
    global.fetch = mockFetch(200, { challenge: 'ch' });
    await getAuthenticationOptions('alice');
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/authentication/options',
      expect.objectContaining({ method: 'POST' })
    );
  });
});

describe('verifyAuthentication', () => {
  // The browser's assertion response should be POSTed to the authentication verify endpoint
  it('calls POST /api/authentication/verify', async () => {
    global.fetch = mockFetch(200, { verified: true });
    const response = { id: 'cred-id' };
    await verifyAuthentication(response);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/authentication/verify',
      expect.objectContaining({ method: 'POST' })
    );
  });
});

describe('getMe', () => {
  // Should GET the current user's profile and include cookies so the session is sent
  it('calls GET /api/user/me with credentials: include', async () => {
    global.fetch = mockFetch(200, { user: { id: 'u1', username: 'alice' }, credentials: [] });
    const result = await getMe();
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/user/me',
      expect.objectContaining({ credentials: 'include' })
    );
    expect(result.ok).toBe(true);
  });
});

describe('logout', () => {
  // Should POST to the logout endpoint to destroy the server-side session
  it('calls POST /api/user/logout', async () => {
    global.fetch = mockFetch(200, { success: true });
    await logout();
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/user/logout',
      expect.objectContaining({ method: 'POST' })
    );
  });
});

describe('deleteCredential', () => {
  // Credential IDs can contain special characters so the id must be URL-encoded in the path
  it('calls DELETE with URL-encoded credential id', async () => {
    global.fetch = mockFetch(200, { success: true });
    await deleteCredential('cred/with/slashes');
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/user/credentials/cred%2Fwith%2Fslashes',
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});
