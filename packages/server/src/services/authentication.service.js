import { AppError } from '../middleware/error-handler.js';
import { findUserByUsername } from '../db/repositories/user.repository.js'; 
import {findCredentialsByUserId, findCredentialById, updateCredentialCounter } from '../db/repositories/credential.repository.js';                                                
import { generateAuthenticationConfig, verifyAuthentication } from './webauthn.service.js';

// Returns all stored credential IDs for a user
export async function getAuthenticationOptions(username) {
  let userId = null;
  let credentials = [];
  if (username) {
    const user = findUserByUsername(username);
    if (!user) throw new AppError(404, 'User not found.');
    credentials = findCredentialsByUserId(user.id);
    userId = user.id;
  }
  const options = await generateAuthenticationConfig(credentials);
  return { options, userId };
}

export async function verifyAuthenticationResponse(challenge, response, sessionUserId) {
  const credential = findCredentialById(response.id);
  if (!credential) throw new AppError(401, 'Authentication failed.');
  if (sessionUserId && credential.userId !== sessionUserId) {
    throw new AppError(401, 'Authentication failed.');
  }
  let verification;
  try {
    verification = await verifyAuthentication(challenge, response, credential);
  } catch (verifyErr) {
    const message = verifyErr instanceof Error ? verifyErr.message : 'Verification error';
    throw new AppError(400, `Authentication failed: ${message}`);
  }
  if (!verification.verified) throw new AppError(401, 'Authentication verification failed.');
  updateCredentialCounter(credential.id, verification.authenticationInfo.newCounter);
  return { userId: credential.userId };
}
