import { jest } from '@jest/globals';

jest.unstable_mockModule('../../../db/repositories/user.repository.js', () => ({
  findUserByUsername: jest.fn(),
}));

jest.unstable_mockModule('../../../db/repositories/credential.repository.js', () => ({
  findCredentialsByUserId: jest.fn(),
  findCredentialById: jest.fn(),
  updateCredentialCounter: jest.fn(),
}));

jest.unstable_mockModule('../../../services/webauthn.service.js', () => ({
  generateAuthenticationConfig: jest.fn(),
  verifyAuthentication: jest.fn(),
}));

const { findUserByUsername } =
  await import('../../../db/repositories/user.repository.js');
const { findCredentialsByUserId, findCredentialById, updateCredentialCounter } =
  await import('../../../db/repositories/credential.repository.js');
const { generateAuthenticationConfig, verifyAuthentication } =
  await import('../../../services/webauthn.service.js');
const { getAuthenticationOptions, verifyAuthenticationResponse } =
  await import('../../../services/authentication.service.js');

const USER = { id: 'user-1', username: 'alice' };
const CREDENTIAL = { id: 'cred-1', userId: 'user-1', publicKey: new Uint8Array([1]), counter: 0, transports: [] };
const FAKE_OPTIONS = { challenge: 'test-challenge' };
const AUTH_RESPONSE = { id: 'cred-1' };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getAuthenticationOptions', () => {
  // Named login — look up the user's credentials so the browser knows which key to use
  it('returns options and userId when username is provided and user is found', async () => {
    findUserByUsername.mockReturnValue(USER);
    findCredentialsByUserId.mockReturnValue([CREDENTIAL]);
    generateAuthenticationConfig.mockResolvedValue(FAKE_OPTIONS);

    const result = await getAuthenticationOptions('alice');

    expect(result.options).toBe(FAKE_OPTIONS);
    expect(result.userId).toBe('user-1');
    expect(generateAuthenticationConfig).toHaveBeenCalledWith([CREDENTIAL]);
  });

  // If the username doesn't exist in our database, there's nothing to authenticate
  it('throws AppError(404) when username is provided but user not found', async () => {
    findUserByUsername.mockReturnValue(null);

    await expect(getAuthenticationOptions('unknown')).rejects.toThrow(
      expect.objectContaining({ statusCode: 404 })
    );
  });

  // Discoverable flow — no username given, let the device figure out which key to offer
  it('returns options with null userId when no username (discoverable flow)', async () => {
    generateAuthenticationConfig.mockResolvedValue(FAKE_OPTIONS);

    const result = await getAuthenticationOptions(undefined);

    expect(findUserByUsername).not.toHaveBeenCalled();
    expect(result.userId).toBeNull();
    expect(result.options).toBe(FAKE_OPTIONS);
    expect(generateAuthenticationConfig).toHaveBeenCalledWith([]);
  });
});

describe('verifyAuthenticationResponse', () => {
  // The signature checks out — bump the counter to prevent replay and return the userId
  it('updates counter and returns userId on success', async () => {
    findCredentialById.mockReturnValue(CREDENTIAL);
    verifyAuthentication.mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 5 },
    });

    const result = await verifyAuthenticationResponse('challenge', AUTH_RESPONSE, null);

    expect(updateCredentialCounter).toHaveBeenCalledWith('cred-1', 5);
    expect(result).toEqual({ userId: 'user-1' });
  });

  // The credential ID from the browser doesn't match anything we have stored
  it('throws AppError(401) when credential is not found', async () => {
    findCredentialById.mockReturnValue(null);

    await expect(
      verifyAuthenticationResponse('challenge', AUTH_RESPONSE, null)
    ).rejects.toThrow(expect.objectContaining({ statusCode: 401 }));
  });

  // The session says one user is logged in but the presented passkey belongs to someone else
  it('throws AppError(401) when credential userId does not match session userId', async () => {
    findCredentialById.mockReturnValue({ ...CREDENTIAL, userId: 'user-1' });

    await expect(
      verifyAuthenticationResponse('challenge', AUTH_RESPONSE, 'other-user')
    ).rejects.toThrow(expect.objectContaining({ statusCode: 401 }));
  });

  // The WebAuthn library itself threw (e.g. bad signature) — wrap it as a 400
  it('throws AppError(400) when verifyAuthentication throws', async () => {
    findCredentialById.mockReturnValue(CREDENTIAL);
    verifyAuthentication.mockRejectedValue(new Error('Invalid signature'));

    await expect(
      verifyAuthenticationResponse('challenge', AUTH_RESPONSE, null)
    ).rejects.toThrow(expect.objectContaining({ statusCode: 400 }));
  });

  // The library returned cleanly but said the signature didn't verify — still a 401
  it('throws AppError(401) when verified is false', async () => {
    findCredentialById.mockReturnValue(CREDENTIAL);
    verifyAuthentication.mockResolvedValue({ verified: false, authenticationInfo: {} });

    await expect(
      verifyAuthenticationResponse('challenge', AUTH_RESPONSE, null)
    ).rejects.toThrow(expect.objectContaining({ statusCode: 401 }));
  });

  // With no session userId (discoverable login), any matching credential should be accepted
  it('does not check sessionUserId when it is null (discoverable flow)', async () => {
    findCredentialById.mockReturnValue(CREDENTIAL);
    verifyAuthentication.mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 1 },
    });

    const result = await verifyAuthenticationResponse('challenge', AUTH_RESPONSE, null);
    expect(result.userId).toBe('user-1');
  });
});
