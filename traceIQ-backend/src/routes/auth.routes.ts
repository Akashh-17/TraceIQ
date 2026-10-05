import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { jwtAuthMiddleware } from '../middlewares/jwtAuth.middleware';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiter specifically for login to prevent brute force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many login attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for signup — prevents automated tenant creation
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { success: false, message: 'Too many signup attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/v1/auth/signup — create a new tenant + first admin user
router.post('/signup', signupLimiter, authController.signup);

// Endpoint for adding a user to an existing tenant — requires an authenticated admin
router.post('/register', jwtAuthMiddleware, authController.register);

// POST /api/v1/auth/login
// Public route to authenticate a user
router.post('/login', loginLimiter, authController.login);

// POST /api/v1/auth/refresh
// Public route (relies on HttpOnly cookie) to get a new access token
router.post('/refresh', authController.refresh);

// POST /api/v1/auth/logout
// Public route to log out of the current device
router.post('/logout', authController.logout);

// POST /api/v1/auth/logout-all
// Protected route to log out of all devices
router.post('/logout-all', jwtAuthMiddleware, authController.logoutAll);

// POST /api/v1/auth/change-password
// Protected route — verifies current password before updating
router.post('/change-password', jwtAuthMiddleware, authController.changePassword);

export default router;
