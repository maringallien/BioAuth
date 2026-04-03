import { jest } from '@jest/globals';
import supertest from 'supertest';
import express from 'express';
import session from 'express-session';

// Mock registration service
jest.unstable_mockModule('../../services/registration.service.js', () => ({
  getRegistrationOptions: jest.fn(),
  verifyRegistrationResponse: jest.fn(),
}));

// Mock rate limiters with functions that just call next()
jest.unstable_mockModule('../../middleware/rate-limiter.js', () => ({
  authLimiter: (_req, _res, next) => next(),
  generalLimiter: (_req, _res, next) => next(),
}));

// Import mocked functions to configure their return values in each test
const { getRegistrationOptions, verifyRegistrationResponse } =
  await import('../../services/registration.service.js');
const { default: registrationRouter } = await import('../../routes/registration.routes.js');
const { errorHandler } = await import('../../middleware/error-handler.js');

// Build minimal express app to test registration routes
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: 'test-secret', resave: false, saveUninitialized: false }));
  app.use('/api/registration', registrationRouter);
  app.use(errorHandler);
  return app;
}

// Fake WebAuthn options object
const FAKE_OPTIONS = { challenge: 'test-challenge', rpId: 'localhost', allowCredentials: [] };
// Fake browser response that matches ZOD validation schema
const VALID_REG_BODY = {
  id: 'cred-id',
  rawId: 'cred-raw-id',
  response: { clientDataJSON: 'data', attestationObject: 'attest' },
  type: 'public-key',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/registration/options', () => {
  // A well-formed request with a valid username should get back a WebAuthn options object
  it('returns 200 with challenge options for a valid username', async () => {
    getRegistrationOptions.mockResolvedValue({ options: FAKE_OPTIONS, userId: 'user-1' });

    const res = await supertest(buildApp())
      .post('/api/registration/options')
      .send({ username: 'alice' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(FAKE_OPTIONS);
    expect(getRegistrationOptions).toHaveBeenCalledWith('alice');
  });

  // A two-character username should be caught by Zod validation and return a 400
  it('returns 400 for a username that is too short', async () => {
    const res = await supertest(buildApp())
      .post('/api/registration/options')
      .send({ username: 'ab' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(getRegistrationOptions).not.toHaveBeenCalled();
  });

  // Sending an empty body should also fail validation 
  it('returns 400 when username is missing', async () => {
    const res = await supertest(buildApp())
      .post('/api/registration/options')
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('POST /api/registration/verify', () => {
  // Return 400 when there is no challenge in the session
  it('returns 400 when there is no active challenge in session', async () => {
    const res = await supertest(buildApp())
      .post('/api/registration/verify')
      .send(VALID_REG_BODY);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no active registration challenge/i);
    expect(verifyRegistrationResponse).not.toHaveBeenCalled();
  });

  // Test correct path works:get options first so the session has a challenge, then verify
  it('returns 200 with verified result after options are obtained', async () => {
    getRegistrationOptions.mockResolvedValue({ options: FAKE_OPTIONS, userId: 'user-1' });
    verifyRegistrationResponse.mockResolvedValue({ verified: true });

    const agent = supertest.agent(buildApp());

    await agent.post('/api/registration/options').send({ username: 'alice' });

    const res = await agent.post('/api/registration/verify').send(VALID_REG_BODY);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ verified: true });
    expect(verifyRegistrationResponse).toHaveBeenCalledWith(
      FAKE_OPTIONS.challenge,
      'user-1',
      expect.objectContaining({ id: 'cred-id', type: 'public-key' })
    );
  });

  // A body that doesn't match the registrationResponseSchema should be rejected with 400
  it('returns 400 when verify body fails schema validation', async () => {
    getRegistrationOptions.mockResolvedValue({ options: FAKE_OPTIONS, userId: 'user-1' });

    const agent = supertest.agent(buildApp());
    await agent.post('/api/registration/options').send({ username: 'alice' });

    const res = await agent
      .post('/api/registration/verify')
      .send({ id: 'x', type: 'wrong-type' });

    expect(res.status).toBe(400);
  });
});
