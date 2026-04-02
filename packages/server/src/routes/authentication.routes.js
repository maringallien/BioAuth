import { Router } from 'express';
import { authLimiter } from '../middleware/rate-limiter.js';
import { AppError } from '../middleware/error-handler.js';
import { authenticationOptionsSchema, authenticationResponseSchema } from '../validation/schemas.js';
import { getAuthenticationOptions, verifyAuthenticationResponse } from '../services/authentication.service.js';

const router = Router();

// Send browser auth options
router.post(
  '/options',
  authLimiter,
  async (req, res, next) => {
    try {
      const { username } = authenticationOptionsSchema.parse(req.body);
      const result = await getAuthenticationOptions(username);
      
      // Store challenge and userId separately
      req.session.currentChallenge = result.options.challenge;
      req.session.userId = result.userId;

      // Send reg options back
      res.json(result.options);
    } catch (err) {
      next(err);
    }
  }
);

// Verify signed challenge
router.post(
  '/verify',
  authLimiter,
  async (req, res, next) => {
    const { currentChallenge, userId: sessionUserId } = req.session;

    if (!currentChallenge) {
      next(new AppError(400, 'No active authentication challenge. Please restart login.'));
      return;
    }

    const response = authenticationResponseSchema.parse(req.body);

    try {
      const result = await verifyAuthenticationResponse(currentChallenge, response, sessionUserId);
      req.session.currentChallenge = undefined;
      req.session.userId = result.userId;
      res.json({ verified: true });
    } catch (err) {
      req.session.currentChallenge = undefined;
      next(err);
    }
  }
);

export default router;
