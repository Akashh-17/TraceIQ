import { Router } from 'express';
import { usersController } from '../controllers/users.controller';
import { jwtAuthMiddleware } from '../middlewares/jwtAuth.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';
import { Permission } from '../types/rbac.types';

const router = Router();

// Only TENANT_ADMIN and SUPER_ADMIN can manage users.
// Both have MANAGE_USERS permission.

// GET /api/v1/users
router.get('/', jwtAuthMiddleware, requirePermission(Permission.MANAGE_USERS), usersController.listUsers);

// POST /api/v1/users
router.post('/', jwtAuthMiddleware, requirePermission(Permission.MANAGE_USERS), usersController.createUser);

// PATCH /api/v1/users/:id/role
router.patch('/:id/role', jwtAuthMiddleware, requirePermission(Permission.MANAGE_USERS), usersController.updateRole);

export default router;
