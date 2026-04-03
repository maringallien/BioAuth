import {
  usernameSchema,
  registrationOptionsSchema,
  authenticationOptionsSchema,
  registrationResponseSchema,
  authenticationResponseSchema,
  credentialIdParamSchema,
} from '../../validation/schemas.js';

const VALID_REG_RESPONSE = {
  id: 'cred-id-123',
  rawId: 'cred-raw-id-123',
  response: {
    clientDataJSON: 'base64data',
    attestationObject: 'base64attest',
  },
  type: 'public-key',
};

const VALID_AUTH_RESPONSE = {
  id: 'cred-id-123',
  rawId: 'cred-raw-id-123',
  response: {
    clientDataJSON: 'base64data',
    authenticatorData: 'base64authdata',
    signature: 'base64sig',
  },
  type: 'public-key',
};

describe('usernameSchema', () => {
  // Normal usernames with letters, numbers, and underscores should pass
  it('accepts valid usernames', () => {
    expect(() => usernameSchema.parse('alice')).not.toThrow();
    expect(() => usernameSchema.parse('alice_123')).not.toThrow();
    expect(() => usernameSchema.parse('ABC')).not.toThrow();
    expect(() => usernameSchema.parse('a'.repeat(64))).not.toThrow();
  });

  // Whitespace around the username should be stripped before validation
  it('trims whitespace before validation', () => {
    expect(usernameSchema.parse('  alice  ')).toBe('alice');
  });

  // One or two character usernames are too short to be meaningful
  it('rejects usernames that are too short', () => {
    expect(() => usernameSchema.parse('ab')).toThrow();
    expect(() => usernameSchema.parse('')).toThrow();
  });

  // Usernames over 64 characters would be impractical and are blocked
  it('rejects usernames that are too long', () => {
    expect(() => usernameSchema.parse('a'.repeat(65))).toThrow();
  });

  // Symbols like @, -, and spaces are not allowed in usernames
  it('rejects usernames with special characters', () => {
    expect(() => usernameSchema.parse('alice@domain')).toThrow();
    expect(() => usernameSchema.parse('alice-bob')).toThrow();
    expect(() => usernameSchema.parse('alice bob')).toThrow();
    expect(() => usernameSchema.parse('alice!')).toThrow();
  });
});

describe('registrationOptionsSchema', () => {
  // A plain object with a valid username is all that's needed to start registration
  it('accepts valid registration options', () => {
    expect(() => registrationOptionsSchema.parse({ username: 'alice' })).not.toThrow();
  });

  // You can't register without telling us who you are
  it('rejects missing username', () => {
    expect(() => registrationOptionsSchema.parse({})).toThrow();
  });

  // The username inside registration options still has to pass username rules
  it('rejects invalid username', () => {
    expect(() => registrationOptionsSchema.parse({ username: 'ab' })).toThrow();
  });
});

describe('authenticationOptionsSchema', () => {
  // Named login works fine — just pass a username
  it('accepts with username', () => {
    expect(() => authenticationOptionsSchema.parse({ username: 'alice' })).not.toThrow();
  });

  // Passwordless discoverable login sends no username at all
  it('accepts without username (discoverable flow)', () => {
    expect(() => authenticationOptionsSchema.parse({})).not.toThrow();
  });

  // If a username is provided it still has to be a valid one
  it('rejects invalid username when provided', () => {
    expect(() => authenticationOptionsSchema.parse({ username: 'ab' })).toThrow();
  });
});

describe('registrationResponseSchema', () => {
  // A well-formed WebAuthn registration response from the browser should pass
  it('accepts a valid registration response', () => {
    expect(() => registrationResponseSchema.parse(VALID_REG_RESPONSE)).not.toThrow();
  });

  // The browser can optionally tell us which transports the key supports
  it('accepts optional transports in response', () => {
    const withTransports = {
      ...VALID_REG_RESPONSE,
      response: { ...VALID_REG_RESPONSE.response, transports: ['internal', 'hybrid'] },
    };
    expect(() => registrationResponseSchema.parse(withTransports)).not.toThrow();
  });

  // A response without an id field is obviously malformed
  it('rejects missing id', () => {
    const { id: _id, ...noId } = VALID_REG_RESPONSE;
    expect(() => registrationResponseSchema.parse(noId)).toThrow();
  });

  // The type field must be exactly 'public-key' — anything else is rejected
  it('rejects wrong type value', () => {
    expect(() => registrationResponseSchema.parse({ ...VALID_REG_RESPONSE, type: 'other' })).toThrow();
  });

  // The attestationObject is required — without it there's nothing to verify
  it('rejects missing attestationObject', () => {
    const bad = {
      ...VALID_REG_RESPONSE,
      response: { clientDataJSON: 'x' },
    };
    expect(() => registrationResponseSchema.parse(bad)).toThrow();
  });
});

describe('authenticationResponseSchema', () => {
  // A well-formed WebAuthn assertion response from the browser should pass
  it('accepts a valid authentication response', () => {
    expect(() => authenticationResponseSchema.parse(VALID_AUTH_RESPONSE)).not.toThrow();
  });

  // The browser may include a userHandle for discoverable credentials
  it('accepts optional userHandle', () => {
    const withHandle = {
      ...VALID_AUTH_RESPONSE,
      response: { ...VALID_AUTH_RESPONSE.response, userHandle: 'base64handle' },
    };
    expect(() => authenticationResponseSchema.parse(withHandle)).not.toThrow();
  });

  // Without a signature there's nothing to cryptographically verify
  it('rejects missing signature', () => {
    const bad = {
      ...VALID_AUTH_RESPONSE,
      response: { clientDataJSON: 'x', authenticatorData: 'x' },
    };
    expect(() => authenticationResponseSchema.parse(bad)).toThrow();
  });

  // The authenticatorData is required to check counter values and flags
  it('rejects missing authenticatorData', () => {
    const bad = {
      ...VALID_AUTH_RESPONSE,
      response: { clientDataJSON: 'x', signature: 'x' },
    };
    expect(() => authenticationResponseSchema.parse(bad)).toThrow();
  });
});

describe('credentialIdParamSchema', () => {
  // A non-empty string id is all that's needed for a credential URL param
  it('accepts non-empty id', () => {
    expect(() => credentialIdParamSchema.parse({ id: 'abc123' })).not.toThrow();
  });

  // An empty string id would be meaningless and should be caught early
  it('rejects empty id', () => {
    expect(() => credentialIdParamSchema.parse({ id: '' })).toThrow();
  });

  // A missing id param means the URL was malformed
  it('rejects missing id', () => {
    expect(() => credentialIdParamSchema.parse({})).toThrow();
  });
});
