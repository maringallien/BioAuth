import { jest } from '@jest/globals';

jest.unstable_mockModule('../../../db/repositories/user.repository.js', () => ({
  findUserById: jest.fn(),
}));

jest.unstable_mockModule('../../../db/repositories/credential.repository.js', () => ({
  findCredentialsByUserId: jest.fn(),
  findCredentialById: jest.fn(),
  deleteCredential: jest.fn(),
}));

const { findUserById } = await import('../../../db/repositories/user.repository.js');
const { findCredentialsByUserId, findCredentialById, deleteCredential } =
  await import('../../../db/repositories/credential.repository.js');
const { getUserProfile, removeCredential } = await import('../../../services/user.service.js');

const USER = Object.freeze({ id: 'user-1', username: 'alice', createdAt: '2024-01-01T00:00:00Z' });
const CRED_1 = Object.freeze({ id: 'cred-1', userId: 'user-1', deviceType: 'platform', backedUp: false, transports: [], createdAt: '2024-01-01T00:00:00Z' });
const CRED_2 = Object.freeze({ id: 'cred-2', userId: 'user-1', deviceType: 'platform', backedUp: true, transports: ['internal'], createdAt: '2024-01-02T00:00:00Z' });

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getUserProfile', () => {
  // Happy path — should return the user plus their list of registered passkeys
  it('returns user and credentials for a valid userId', () => {
    findUserById.mockReturnValue(USER);
    findCredentialsByUserId.mockReturnValue([CRED_1, CRED_2]);

    const result = getUserProfile('user-1');

    expect(result.user).toEqual({ id: 'user-1', username: 'alice', createdAt: USER.createdAt });
    expect(result.credentials).toHaveLength(2);
    expect(result.credentials[0].id).toBe('cred-1');
  });

  // If there's no user in the DB, the session is stale and we should treat it as unauthenticated
  it('throws AppError(401) when user is not found', async () => {
    findUserById.mockReturnValue(null);
    const { AppError } = await import('../../../middleware/error-handler.js');

    expect(() => getUserProfile('nonexistent')).toThrow(AppError);
    expect(() => getUserProfile('nonexistent')).toThrow(expect.objectContaining({ statusCode: 401 }));
  });
});

describe('removeCredential', () => {
  // Normal deletion — the credential exists, belongs to the user, and isn't their last one
  it('deletes the credential and returns success', () => {
    findCredentialById.mockReturnValue(CRED_1);
    findCredentialsByUserId.mockReturnValue([CRED_1, CRED_2]);

    const result = removeCredential('user-1', 'cred-1');

    expect(deleteCredential).toHaveBeenCalledWith('cred-1');
    expect(result).toEqual({ success: true });
  });

  // Trying to delete a credential ID that doesn't exist should be a 404
  it('throws AppError(404) when credential is not found', async () => {
    findCredentialById.mockReturnValue(null);
    const { AppError } = await import('../../../middleware/error-handler.js');

    expect(() => removeCredential('user-1', 'nonexistent')).toThrow(
      expect.objectContaining({ statusCode: 404 })
    );
  });

  // You shouldn't be able to delete someone else's passkey — that's a 403
  it('throws AppError(403) when credential belongs to another user', async () => {
    findCredentialById.mockReturnValue({ ...CRED_1, userId: 'other-user' });
    const { AppError } = await import('../../../middleware/error-handler.js');

    expect(() => removeCredential('user-1', 'cred-1')).toThrow(
      expect.objectContaining({ statusCode: 403 })
    );
  });

  // Deleting your only passkey would lock you out — block it with a 400
  it('throws AppError(400) when trying to delete the last credential', async () => {
    findCredentialById.mockReturnValue(CRED_1);
    findCredentialsByUserId.mockReturnValue([CRED_1]);
    const { AppError } = await import('../../../middleware/error-handler.js');

    expect(() => removeCredential('user-1', 'cred-1')).toThrow(
      expect.objectContaining({ statusCode: 400 })
    );
    expect(deleteCredential).not.toHaveBeenCalled();
  });
});
