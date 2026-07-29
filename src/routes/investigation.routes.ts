import { Router } from 'express';
import { investigate } from '../controllers/investigation.controller';
import { jwtAuthMiddleware } from '../middlewares/jwtAuth.middleware';

const router = Router();

// Protect with JWT — only humans using the dashboard can trigger AI investigations
router.use(jwtAuthMiddleware);

router.post('/', investigate);

export default router;
