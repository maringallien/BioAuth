import { jest } from '@jest/globals';

jest.unstable_mockModule('../../../db/repositories/user.repository.js', () => ({
  findUserByUsername: jest.fn(),
  createUser: jest.fn(),
}));

jest.unstable_mockModule('../../../db/repositories/credential.repository.js', () => ({
  findCredentialsByUserId: jest.fn(),
  saveCredential: jest.fn(),
}));

jest.unstable_mockModule('../../../services/webauthn.service.js', () => ({
  generateRegistrationConfig: jest.fn(),
  verifyRegistration: jest.fn(),
}));

const { findUserByUsername, createUser } =
  await import('../../../db/repositories/user.repository.js');
const { findCredentialsByUserId, saveCredential } =
  await import('../../../db/repositories/credential.repository.js');
const { generateRegistrationConfig, verifyRegistration } =
  await import('../../../services/webauthn.service.js');
const { getRegistrationOptions, verifyRegistrationResponse } =
  await import('../../../services/registration.service.js');

const USER = { id: 'user-1', username: 'alice', createdAt: '2024-01-01T00:00:00Z' };
const FAKE_OPTIONS = { challenge: 'test-challenge', rpId: 'localhost' };
const FAKE_CREDENTIAL = { id: 'cred-1', publicKey: new Uint8Array([1, 2, 3]), counter: 0 };
const FAKE_VERIFICATION = {
  verified: true,
  registrationInfo: {
    credential: FAKE_CREDENTIAL,
    credentialDeviceType: 'platform',
    credentialBackedUp: false,
  },
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getRegistrationOptions', () => {
  // First-time registration — the user doesn't exist yet so we create one on the fly
  it('creates a new user when not found, then returns options', async () => {
    findUserByUsername.mockReturnValue(null);
    createUser.mockReturnValue(USER);
    findCredentialsByUserId.mockReturnValue([]);
    generateRegistrationConfig.mockResolvedValue(FAKE_OPTIONS);

    const result = await getRegistrationOptions('alice');

    expect(createUser).toHaveBeenCalledWith('alice');
    expect(result.options).toBe(FAKE_OPTIONS);
    expect(result.userId).toBe('user-1');
  });

  // Returning user adding a second passkey — should reuse their existing account
  it('uses existing user when found', async () => {
    findUserByUsername.mockReturnValue(USER);
    findCredentialsByUserId.mockReturnValue([]);
    generateRegistrationConfig.mockResolvedValue(FAKE_OPTIONS);

    const result = await getRegistrationOptions('alice');

    expect(createUser).not.toHaveBeenCalled();
    expect(result.userId).toBe('user-1');
  });

  // Existing credentials are passed along so the browser can exclude them from the prompt
  it('passes existing credentials to generateRegistrationConfig', async () => {
    const existingCreds = [{ id: 'existing', transports: ['internal'] }];
    findUserByUsername.mockReturnValue(USER);
    findCredentialsByUserId.mockReturnValue(existingCreds);
    generateRegistrationConfig.mockResolvedValue(FAKE_OPTIONS);

    await getRegistrationOptions('alice');

    expect(generateRegistrationConfig).toHaveBeenCalledWith(USER, existingCreds);
  });
});

describe('verifyRegistrationResponse', () => {
  const FAKE_RESPONSE = {
    id: 'cred-1',
    response: { transports: ['internal'] },
  };

  // The browser's signed response checks out — save the credential and confirm success
  it('saves credential and returns verified true on success', async () => {
    verifyRegistration.mockResolvedValue(FAKE_VERIFICATION);

    const result = await verifyRegistrationResponse('challenge', 'user-1', FAKE_RESPONSE);

    expect(saveCredential).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'cred-1',
        userId: 'user-1',
        publicKey: FAKE_CREDENTIAL.publicKey,
        counter: 0,
        deviceType: 'platform',
        backedUp: false,
        transports: ['internal'],
      })
    );
    expect(result).toEqual({ verified: true });
  });

  // If the WebAuthn library says verification failed, reject with a 400
  it('throws AppError(400) when verification fails (verified: false)', async () => {
    verifyRegistration.mockResolvedValue({ verified: false, registrationInfo: null });
    const { AppError } = await import('../../../middleware/error-handler.js');

    await expect(
      verifyRegistrationResponse('challenge', 'user-1', FAKE_RESPONSE)
    ).rejects.toThrow(expect.objectContaining({ statusCode: 400 }));
    expect(saveCredential).not.toHaveBeenCalled();
  });

  // A missing registrationInfo means we have nothing to save — also a 400
  it('throws AppError(400) when registrationInfo is null', async () => {
    verifyRegistration.mockResolvedValue({ verified: true, registrationInfo: null });

    await expect(
      verifyRegistrationResponse('challenge', 'user-1', FAKE_RESPONSE)
    ).rejects.toThrow(expect.objectContaining({ statusCode: 400 }));
  });

  // If the browser didn't report transports, we should default to an empty array rather than crashing
  it('uses empty array for transports when not provided in response', async () => {
    verifyRegistration.mockResolvedValue(FAKE_VERIFICATION);
    const responseNoTransports = { id: 'cred-1', response: {} };

    await verifyRegistrationResponse('challenge', 'user-1', responseNoTransports);

    expect(saveCredential).toHaveBeenCalledWith(
      expect.objectContaining({ transports: [] })
    );
  });
});
