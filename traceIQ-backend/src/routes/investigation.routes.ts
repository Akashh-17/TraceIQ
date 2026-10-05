import { Router } from 'express';
import { investigate, listInvestigations } from '../controllers/investigation.controller';
import { jwtAuthMiddleware } from '../middlewares/jwtAuth.middleware';
import rateLimit from 'express-rate-limit';

const router = Router();

const investigateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { success: false, message: 'Too many investigation requests, please wait a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// All investigation endpoints require a logged-in user
router.use(jwtAuthMiddleware);

// POST /api/v1/ai/investigate — run a new AI investigation
router.post('/', investigateLimiter, investigate);

// GET /api/v1/ai/investigate/history — paginated list of past investigations
router.get('/history', listInvestigations);

export default router;
