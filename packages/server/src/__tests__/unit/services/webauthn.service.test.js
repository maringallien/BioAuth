import { jest } from '@jest/globals';

jest.unstable_mockModule('@simplewebauthn/server', () => ({
  generateRegistrationOptions: jest.fn(),
  verifyRegistrationResponse: jest.fn(),
  generateAuthenticationOptions: jest.fn(),
  verifyAuthenticationResponse: jest.fn(),
}));

const {
  generateRegistrationOptions,
  verifyRegistrationResponse: verifyRegistrationLib,
  generateAuthenticationOptions,
  verifyAuthenticationResponse: verifyAuthenticationLib,
} = await import('@simplewebauthn/server');

const {
  generateRegistrationConfig,
  verifyRegistration,
  generateAuthenticationConfig,
  verifyAuthentication,
} = await import('../../../services/webauthn.service.js');

const { config } = await import('../../../config.js');

const USER = { id: 'user-1', username: 'alice' };
const CRED = { id: 'cred-1', transports: ['internal'] };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('generateRegistrationConfig', () => {
  // The options passed to the library should include our RP details and the user's info
  it('calls generateRegistrationOptions with correct options', async () => {
    generateRegistrationOptions.mockResolvedValue({ challenge: 'ch' });

    await generateRegistrationConfig(USER, [CRED]);

    expect(generateRegistrationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        rpName: config.rpName,
        rpID: config.rpId,
        userName: 'alice',
        attestationType: 'none',
        excludeCredentials: [{ id: 'cred-1', transports: ['internal'] }],
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'required',
        },
      })
    );
  });

  // The WebAuthn spec requires userId to be a BufferSource, not a plain string
  it('encodes userId as Uint8Array', async () => {
    generateRegistrationOptions.mockResolvedValue({ challenge: 'ch' });

    await generateRegistrationConfig(USER, []);

    const call = generateRegistrationOptions.mock.calls[0][0];
    expect(call.userID).toBeInstanceOf(Uint8Array);
  });
});

describe('verifyRegistration', () => {
  // Our RP config (origin, rpId) must be threaded into the verification call
  it('calls verifyRegistrationResponse with correct options', async () => {
    const response = { id: 'cred-1' };
    verifyRegistrationLib.mockResolvedValue({ verified: true });

    await verifyRegistration('expected-challenge', response);

    expect(verifyRegistrationLib).toHaveBeenCalledWith({
      response,
      expectedChallenge: 'expected-challenge',
      expectedOrigin: config.rpOrigin,
      expectedRPID: config.rpId,
    });
  });
});

describe('generateAuthenticationConfig', () => {
  // When we know who's logging in, we can hint the browser to show only their keys
  it('sets allowCredentials when credentials are provided', async () => {
    generateAuthenticationOptions.mockResolvedValue({ challenge: 'ch' });

    await generateAuthenticationConfig([CRED]);

    expect(generateAuthenticationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        allowCredentials: [{ id: 'cred-1', transports: ['internal'] }],
      })
    );
  });

  // For discoverable login, allowCredentials must be omitted (not an empty array) per the spec
  it('sets allowCredentials to undefined when credentials is empty', async () => {
    generateAuthenticationOptions.mockResolvedValue({ challenge: 'ch' });

    await generateAuthenticationConfig([]);

    const call = generateAuthenticationOptions.mock.calls[0][0];
    expect(call.allowCredentials).toBeUndefined();
  });
});

describe('verifyAuthentication', () => {
  // The stored credential's public key and counter must be passed so the library can verify the signature
  it('calls verifyAuthenticationResponse with correct credential shape', async () => {
    const credential = {
      id: 'cred-1',
      publicKey: new Uint8Array([1, 2, 3]),
      counter: 10,
      transports: ['internal'],
    };
    const response = { id: 'cred-1' };
    verifyAuthenticationLib.mockResolvedValue({ verified: true });

    await verifyAuthentication('challenge', response, credential);

    expect(verifyAuthenticationLib).toHaveBeenCalledWith({
      response,
      expectedChallenge: 'challenge',
      expectedOrigin: config.rpOrigin,
      expectedRPID: config.rpId,
      credential: {
        id: 'cred-1',
        publicKey: credential.publicKey,
        counter: 10,
        transports: ['internal'],
      },
    });
  });
});
