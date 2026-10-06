import { Router } from 'express';
import { webhookController } from '../controllers/webhook.controller';
import { jwtAuthMiddleware } from '../middlewares/jwtAuth.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';
import { Permission } from '../types/rbac.types';

const router = Router();

// Admin-only: whoever controls the webhook URL receives every detection for the tenant.
router.use(jwtAuthMiddleware, requirePermission(Permission.MANAGE_API_KEYS));

router.get('/',      webhookController.getConfig);
router.put('/',      webhookController.upsert);
router.delete('/',   webhookController.delete);
router.post('/test', webhookController.sendTest);

export default router;
