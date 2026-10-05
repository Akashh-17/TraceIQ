import { Router } from 'express';
import { actorsController } from '../controllers/actors.controller';
import { jwtAuthMiddleware } from '../middlewares/jwtAuth.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';
import { Permission } from '../types/rbac.types';

const router = Router();

// GET /api/v1/actors/:actor
router.get(
  '/:actor',
  jwtAuthMiddleware,
  requirePermission(Permission.VIEW_EVENTS),
  actorsController.getActorProfile
);

export default router;
