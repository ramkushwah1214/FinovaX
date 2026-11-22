import { Router } from 'express';
import {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  forgotPassword,
  resetPassword,
  deleteAccount
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { checkDbReady } from '../middleware/checkDbReady';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

// Public Authentication Endpoints (Rate limited + DB ready)
router.post('/register', checkDbReady, authLimiter, register);
router.post('/login', checkDbReady, authLimiter, login);
router.post('/logout', logout);
router.post('/forgot-password', checkDbReady, authLimiter, forgotPassword);
router.post('/reset-password', checkDbReady, authLimiter, resetPassword);

// Protected Authentication Endpoints (Require valid JWT session + DB ready)
router.get('/me', checkDbReady, authenticate, getProfile);
router.patch('/profile', checkDbReady, authenticate, updateProfile);
router.delete('/account', checkDbReady, authenticate, deleteAccount);

export default router;
