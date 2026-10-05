import { Router } from 'express';
import { apiKeysController } from '../controllers/apikeys.controller';
import { jwtAuthMiddleware } from '../middlewares/jwtAuth.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';
import { Permission } from '../types/rbac.types';

const router = Router();

// GET /api/v1/api-keys
router.get('/', jwtAuthMiddleware, requirePermission(Permission.MANAGE_USERS), apiKeysController.listApiKeys);

// POST /api/v1/api-keys/roll
router.post('/roll', jwtAuthMiddleware, requirePermission(Permission.MANAGE_USERS), apiKeysController.rollApiKey);

export default router;
