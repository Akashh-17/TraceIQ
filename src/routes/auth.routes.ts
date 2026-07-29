import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { jwtAuthMiddleware } from '../middlewares/jwtAuth.middleware';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiter specifically for login to prevent brute force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per `window` (here, per 15 minutes)
  message: { success: false, message: 'Too many login attempts, please try again after 15 minutes' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Endpoint for creating a new user
router.post('/register', authController.register);

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

export default router;
