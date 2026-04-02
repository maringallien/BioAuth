import { AppError } from '../middleware/error-handler.js';
import { findUserById } from '../db/repositories/user.repository.js';
import {
  findCredentialsByUserId,
  findCredentialById,
  deleteCredential,
} from '../db/repositories/credential.repository.js';

export function getUserProfile(userId) {
  const user = findUserById(userId);
  if (!user) throw new AppError(401, 'User not found.');
  const credentials = findCredentialsByUserId(userId);
  return {
    user: { id: user.id, username: user.username, createdAt: user.createdAt },
    credentials: credentials.map((c) => ({
      id: c.id,
      deviceType: c.deviceType,
      backedUp: c.backedUp,
      transports: c.transports,
      createdAt: c.createdAt,
    })),
  };
}

export function removeCredential(userId, credentialId) {
  const credential = findCredentialById(credentialId);
  if (!credential) throw new AppError(404, 'Credential not found.');
  if (credential.userId !== userId) throw new AppError(403, 'You do not have permission to delete this credential.');
  const all = findCredentialsByUserId(userId);
  if (all.length <= 1) throw new AppError(400, 'Cannot delete the last credential. You would be locked out.');
  deleteCredential(credentialId);
  return { success: true };
}
