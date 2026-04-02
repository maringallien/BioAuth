import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { config } from '../config.js';

// Generate challenge and package with app details (app name, domain, username...)
export async function generateRegistrationConfig(user, existingCredentials) {
  const opts = {
    rpName: config.rpName,
    rpID: config.rpId,
    userName: user.username,
    userID: new TextEncoder().encode(user.id),
    attestationType: 'none',
    excludeCredentials: existingCredentials.map((cred) => ({
      id: cred.id,
      transports: cred.transports,
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'required',
    },
  };

  return generateRegistrationOptions(opts);
}

export async function verifyRegistration(expectedChallenge, response) {
  const opts = {
    response,
    expectedChallenge,
    expectedOrigin: config.rpOrigin,
    expectedRPID: config.rpId,
  };

  return verifyRegistrationResponse(opts);
}

export async function generateAuthenticationConfig(credentials) {
  const opts = {
    rpID: config.rpId,
    userVerification: 'required',
    allowCredentials:
      credentials.length > 0
        ? credentials.map((cred) => ({
            id: cred.id,
            transports: cred.transports,
          }))
        : undefined,
  };

  return generateAuthenticationOptions(opts);
}

export async function verifyAuthentication(expectedChallenge, response, credential) {
  const opts = {
    response,
    expectedChallenge,
    expectedOrigin: config.rpOrigin,
    expectedRPID: config.rpId,
    credential: {
      id: credential.id,
      publicKey: credential.publicKey,
      counter: credential.counter,
      transports: credential.transports,
    },
  };

  return verifyAuthenticationResponse(opts);
}
