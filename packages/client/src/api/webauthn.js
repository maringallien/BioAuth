const BASE = '/api';

// Handles fetch and error logic
async function fetchJson(path, options) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      ...options,
    });

    const body = await res.json();

    if (!res.ok) {
      return { ok: false, error: body.error ?? `HTTP ${res.status}` };
    }

    return { ok: true, data: body };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

export async function getRegistrationOptions(username) {
  return fetchJson('/registration/options', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

export async function verifyRegistration(response) {
  return fetchJson('/registration/verify', {
    method: 'POST',
    body: JSON.stringify(response),
  });
}

export async function getAuthenticationOptions(username) {
  return fetchJson('/authentication/options', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

export async function verifyAuthentication(response) {
  return fetchJson('/authentication/verify', {
    method: 'POST',
    body: JSON.stringify(response),
  });
}

export async function getMe() {
  return fetchJson('/user/me');
}

export async function logout() {
  return fetchJson('/user/logout', { method: 'POST' });
}

export async function deleteCredential(id) {
  return fetchJson(`/user/credentials/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
