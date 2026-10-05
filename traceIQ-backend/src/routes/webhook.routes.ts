import { Router } from 'express';
import { webhookController } from '../controllers/webhook.controller';
import { jwtAuthMiddleware } from '../middlewares/jwtAuth.middleware';

const router = Router();

router.get('/',     jwtAuthMiddleware, webhookController.getConfig);
router.put('/',     jwtAuthMiddleware, webhookController.upsert);
router.delete('/',  jwtAuthMiddleware, webhookController.delete);
router.post('/test', jwtAuthMiddleware, webhookController.sendTest);

export default router;
