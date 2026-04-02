import { Router } from 'express';
import { authLimiter } from '../middleware/rate-limiter.js';
import { AppError } from '../middleware/error-handler.js';
import { registrationOptionsSchema, registrationResponseSchema } from '../validation/schemas.js';
import { getRegistrationOptions, verifyRegistrationResponse } from '../services/registration.service.js';

const router = Router();

// Sends browser auth options
router.post(
  '/options',
  authLimiter,
  async (req, res, next) => {
    try {
      const { username } = registrationOptionsSchema.parse(req.body);
      const result = await getRegistrationOptions(username);

      // Store challenge and userId separately
      req.session.currentChallenge = result.options.challenge;
      req.session.userId = result.userId;

      // Send regi options back
      res.json(result.options);
    } catch (err) {
      next(err);
    }
  }
);

// Verifies signed challenge
router.post(
  '/verify',
  authLimiter,
  async (req, res, next) => {
    try {
      const { currentChallenge, userId } = req.session;

      if (!currentChallenge || !userId) {
        throw new AppError(400, 'No active registration challenge. Please restart registration.');
      }

      const response = registrationResponseSchema.parse(req.body);
      const result = await verifyRegistrationResponse(currentChallenge, userId, response);
      req.session.currentChallenge = undefined;
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
