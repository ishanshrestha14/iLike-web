import express from 'express';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import {
  register,
  login,
  refreshAccessToken,
  logoutUser,
  getProfile,
  getCurrentUser,
  updateProfile,
  getAllUsers,
} from '../controllers/userController.js';
import { authenticateToken } from '../middleware/auth.js';
import { blockUser, unblockUser, reportUser } from '../controllers/blockReportController.js';

const router = express.Router();

// Rate limiters for auth routes
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { message: 'Too many registration attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { message: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation error handler
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Public routes
router.post('/register', registerLimiter, [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  validate,
], register);

router.post('/login', loginLimiter, [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
], login);

router.post('/refresh', refreshAccessToken);
router.post('/logout', logoutUser);

// Protected routes (requires valid token to access)
router.get('/', authenticateToken, getAllUsers);
router.get('/me', authenticateToken, getCurrentUser);

// Profile routes
router.route('/profile/:id')
  .get(authenticateToken, getProfile)
  .put(authenticateToken, updateProfile);

// Block/Report routes
router.post('/block/:id', authenticateToken, blockUser);
router.delete('/block/:id', authenticateToken, unblockUser);
router.post('/report/:id', authenticateToken, reportUser);

export default router;
