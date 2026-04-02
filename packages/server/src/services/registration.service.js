import { findUserByUsername, createUser } from '../db/repositories/user.repository.js';
import { findCredentialsByUserId, saveCredential } from '../db/repositories/credential.repository.js';
import { generateRegistrationConfig, verifyRegistration } from './webauthn.service.js';
import { AppError } from '../middleware/error-handler.js';

// Create user, create challenge
export async function getRegistrationOptions(username) {
  let user = findUserByUsername(username);
  if (!user) user = createUser(username);
  const existingCredentials = findCredentialsByUserId(user.id);
  const options = await generateRegistrationConfig(user, existingCredentials);
  return { options, userId: user.id };
}

// Verify and save credentials
export async function verifyRegistrationResponse(challenge, userId, response) {
  const verification = await verifyRegistration(challenge, response);
  if (!verification.verified || !verification.registrationInfo) {
    throw new AppError(400, 'Registration verification failed.');
  }
  const { credential } = verification.registrationInfo;
  saveCredential({
    id: credential.id,
    userId,
    publicKey: credential.publicKey,
    counter: credential.counter,
    deviceType: verification.registrationInfo.credentialDeviceType,
    backedUp: verification.registrationInfo.credentialBackedUp,
    transports: (response.response.transports ?? []),
  });
  return { verified: true };
}
