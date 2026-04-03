import { jest } from '@jest/globals';
import supertest from 'supertest';
import express from 'express';
import session from 'express-session';

// Mock user service
jest.unstable_mockModule('../../services/user.service.js', () => ({
  getUserProfile: jest.fn(),
  removeCredential: jest.fn(),
}));

// Mock rate limiters with functions that just call next()
jest.unstable_mockModule('../../middleware/rate-limiter.js', () => ({
  authLimiter: (_req, _res, next) => next(),
  generalLimiter: (_req, _res, next) => next(),
}));

// Import mocked functions to configure their return values in each test
const { getUserProfile, removeCredential } = await import('../../services/user.service.js');
const { default: userRouter } = await import('../../routes/user.routes.js');
const { errorHandler, AppError } = await import('../../middleware/error-handler.js');

// Create fake user profile
const PROFILE = {
  user: { id: 'user-1', username: 'alice', createdAt: '2024-01-01' },
  credentials: [],
};

// Build minimal express app to test user routes
function buildApp({ userId } = {}) {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: 'test-secret', resave: false, saveUninitialized: false }));

  // Inject userId into session for authenticated tests
  if (userId) {
    app.use((req, _res, next) => {
      req.session.userId = userId;
      next();
    });
  }

  app.use('/api/user', userRouter);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/user/me', () => {
  // Without a session the endpoint should refuse to return any user data
  it('returns 401 when not authenticated', async () => {
    const res = await supertest(buildApp()).get('/api/user/me');
    expect(res.status).toBe(401);
    expect(getUserProfile).not.toHaveBeenCalled();
  });

  // With a valid session the full user profile and credentials should come back
  it('returns 200 with user profile when authenticated', async () => {
    getUserProfile.mockReturnValue(PROFILE);

    const res = await supertest(buildApp({ userId: 'user-1' })).get('/api/user/me');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(PROFILE);
    expect(getUserProfile).toHaveBeenCalledWith('user-1');
  });
});

describe('POST /api/user/logout', () => {
  // Logging out should destroy the session and confirm success
  it('destroys session and returns success', async () => {
    const res = await supertest(buildApp({ userId: 'user-1' }))
      .post('/api/user/logout');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });
});

describe('DELETE /api/user/credentials/:id', () => {
  // Without a session, you shouldn't be able to delete anyone's passkeys
  it('returns 401 when not authenticated', async () => {
    const res = await supertest(buildApp())
      .delete('/api/user/credentials/cred-1');

    expect(res.status).toBe(401);
    expect(removeCredential).not.toHaveBeenCalled();
  });

  // Happy path — authenticated user deletes one of their own passkeys
  it('returns 200 on successful credential removal', async () => {
    removeCredential.mockReturnValue({ success: true });

    const res = await supertest(buildApp({ userId: 'user-1' }))
      .delete('/api/user/credentials/cred-1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(removeCredential).toHaveBeenCalledWith('user-1', 'cred-1');
  });

  // The service throws 404 if the credential id doesn't exist in the database
  it('returns 404 when credential is not found', async () => {
    removeCredential.mockImplementation(() => {
      throw new AppError(404, 'Credential not found.');
    });

    const res = await supertest(buildApp({ userId: 'user-1' }))
      .delete('/api/user/credentials/cred-1');

    expect(res.status).toBe(404);
  });

  // The service throws 403 if the credential belongs to a different user
  it('returns 403 when credential belongs to another user', async () => {
    removeCredential.mockImplementation(() => {
      throw new AppError(403, 'Permission denied.');
    });

    const res = await supertest(buildApp({ userId: 'user-1' }))
      .delete('/api/user/credentials/cred-1');

    expect(res.status).toBe(403);
  });

  // The service throws 400 if this is the user's only passkey and deletion would lock them out
  it('returns 400 when trying to delete the last credential', async () => {
    removeCredential.mockImplementation(() => {
      throw new AppError(400, 'Cannot delete last credential.');
    });

    const res = await supertest(buildApp({ userId: 'user-1' }))
      .delete('/api/user/credentials/cred-1');

    expect(res.status).toBe(400);
  });
});
