import { Router } from 'express';
import { authLimiter } from '../middleware/rate-limiter.js';
import { AppError } from '../middleware/error-handler.js';
import { credentialIdParamSchema } from '../validation/schemas.js';
import { getUserProfile, removeCredential } from '../services/user.service.js';

const router = Router();

// Check for active authenticated session
router.get('/me', (req, res, next) => {
  try {
    const { userId } = req.session;
    if (!userId) {
      throw new AppError(401, 'Not authenticated.');
    }
    const result = getUserProfile(userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Destroy any active sessions
router.post('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      next(err);
      return;
    }
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});


router.delete('/credentials/:id', authLimiter, (req, res, next) => {
  try {
    const { userId } = req.session;
    if (!userId) {
      throw new AppError(401, 'Not authenticated.');
    }
    const { id } = credentialIdParamSchema.parse(req.params);
    const result = removeCredential(userId, id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
