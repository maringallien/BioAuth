import { jest } from '@jest/globals';
import supertest from 'supertest';
import express from 'express';
import session from 'express-session';

// Mock authentication service
jest.unstable_mockModule('../../services/authentication.service.js', () => ({
  getAuthenticationOptions: jest.fn(),
  verifyAuthenticationResponse: jest.fn(),
}));

// Mock rate limiters with functions that just call next()
jest.unstable_mockModule('../../middleware/rate-limiter.js', () => ({
  authLimiter: (_req, _res, next) => next(),
  generalLimiter: (_req, _res, next) => next(),
}));

// Import mocked functions to configure their return values in each test
const { getAuthenticationOptions, verifyAuthenticationResponse } =
  await import('../../services/authentication.service.js');
const { default: authRouter } = await import('../../routes/authentication.routes.js');
const { errorHandler } = await import('../../middleware/error-handler.js');

// Build minimal express app to test auth routes
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: 'test-secret', resave: false, saveUninitialized: false }));
  app.use('/api/authentication', authRouter);
  app.use(errorHandler);
  return app;
}

// Fake WebAuthn options object
const FAKE_OPTIONS = { challenge: 'auth-challenge', rpId: 'localhost' };
// Fake browser response that matches ZOD validation schema
const VALID_AUTH_BODY = {
  id: 'cred-id',
  rawId: 'cred-raw-id',
  response: {
    clientDataJSON: 'data',
    authenticatorData: 'authdata',
    signature: 'sig',
  },
  type: 'public-key',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/authentication/options', () => {
  // When user provides username, server should return challenge their registered passkeys can sign
  it('returns 200 with challenge options when username is provided', async () => {
    getAuthenticationOptions.mockResolvedValue({ options: FAKE_OPTIONS, userId: 'user-1' });

    const res = await supertest(buildApp())
      .post('/api/authentication/options')
      .send({ username: 'alice' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(FAKE_OPTIONS);
    expect(getAuthenticationOptions).toHaveBeenCalledWith('alice');
  });

  // Discoverable login sends no username and the server should still return valid challenge
  it('returns 200 without username (discoverable credential flow)', async () => {
    getAuthenticationOptions.mockResolvedValue({ options: FAKE_OPTIONS, userId: null });

    const res = await supertest(buildApp())
      .post('/api/authentication/options')
      .send({});

    expect(res.status).toBe(200);
    expect(getAuthenticationOptions).toHaveBeenCalledWith(undefined);
  });
});

describe('POST /api/authentication/verify', () => {
  // Calling verify before options means the session has no challenge, and must be rejected
  it('returns 400 when there is no active challenge in session', async () => {
    const res = await supertest(buildApp())
      .post('/api/authentication/verify')
      .send(VALID_AUTH_BODY);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no active authentication challenge/i);
  });

  // Normal flow: options first, then verify with the browser's assertion response
  it('returns 200 with verified:true after successful authentication', async () => {
    getAuthenticationOptions.mockResolvedValue({ options: FAKE_OPTIONS, userId: 'user-1' });
    verifyAuthenticationResponse.mockResolvedValue({ userId: 'user-1' });

    const agent = supertest.agent(buildApp());
    await agent.post('/api/authentication/options').send({ username: 'alice' });

    const res = await agent.post('/api/authentication/verify').send(VALID_AUTH_BODY);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ verified: true });
    expect(verifyAuthenticationResponse).toHaveBeenCalledWith(
      FAKE_OPTIONS.challenge,
      expect.objectContaining({ id: 'cred-id' }),
      'user-1'
    );
  });

  // After a failed verify the challenge must be cleared so the same attempt can't be retried
  it('clears the challenge on failure to prevent replay', async () => {
    getAuthenticationOptions.mockResolvedValue({ options: FAKE_OPTIONS, userId: null });
    verifyAuthenticationResponse.mockRejectedValue(
      Object.assign(new Error('failed'), { statusCode: 401 })
    );

    const agent = supertest.agent(buildApp());
    await agent.post('/api/authentication/options').send({});

    await agent.post('/api/authentication/verify').send(VALID_AUTH_BODY);

    // Second verify should fail with no active challenge
    const res2 = await agent.post('/api/authentication/verify').send(VALID_AUTH_BODY);
    expect(res2.status).toBe(400);
    expect(res2.body.error).toMatch(/no active authentication challenge/i);
  });
});
