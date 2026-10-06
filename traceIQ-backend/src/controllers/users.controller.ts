import { Request, Response, NextFunction } from 'express';
import { userRepository } from '../models/user.repository';
import { authService } from '../services/auth.service';
import { RegisterUserSchema } from '../types/auth.types';
import { AppError } from '../middlewares/errorHandler';
import { prisma } from '../config/prisma';
import { z } from 'zod/v4';

// Roles a tenant admin may hand out. SUPER_ADMIN is reserved for TraceIQ staff —
// allowing it here would let any tenant admin escalate to platform-wide access.
const ASSIGNABLE_ROLES = ['VIEWER', 'ANALYST', 'AUDITOR', 'TENANT_ADMIN'] as const;

const UpdateRoleSchema = z.object({
  role: z.enum(ASSIGNABLE_ROLES),
});

const NewUserRoleSchema = z.enum(ASSIGNABLE_ROLES).default('VIEWER');

export class UsersController {
  
  // GET /api/v1/users
  listUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId || req.tenant?.id;
      if (!tenantId) throw new AppError('Tenant context missing', 401);

      const users = await userRepository.findMany(tenantId);
      res.status(200).json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  };

  // POST /api/v1/users (Tenant Admins adding new users to their tenant)
  createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId || req.tenant?.id;
      if (!tenantId) throw new AppError('Tenant context missing', 401);

      // We override the tenantId in the body to ensure they only create users for their own tenant
      const payload = { ...req.body, tenantId };
      const result = RegisterUserSchema.safeParse(payload);
      const roleResult = NewUserRoleSchema.safeParse(req.body?.role);

      if (!result.success || !roleResult.success) {
        const errors = [...(result.error?.issues ?? []), ...(roleResult.error?.issues ?? [])];
        res.status(400).json({ success: false, message: 'Validation failed', errors });
        return;
      }

      // We reuse authService.register to handle password hashing and creation
      const user = await authService.register(result.data, roleResult.data);
      res.status(201).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  };

  // PATCH /api/v1/users/me/onboarding — mark onboarding complete for the calling user
  completeOnboarding = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      await prisma.user.update({
        where: { id: userId },
        data: { hasCompletedOnboarding: true },
      });
      res.status(200).json({ success: true });
    } catch (err) {
      next(err);
    }
  };

  // PATCH /api/v1/users/:id/role
  updateRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId || req.tenant?.id;
      if (!tenantId) throw new AppError('Tenant context missing', 401);

      const id = req.params['id'] as string;
      const result = UpdateRoleSchema.safeParse(req.body);

      if (!result.success) {
        res.status(400).json({ success: false, message: 'Validation failed', errors: result.error.issues });
        return;
      }

      // An admin demoting themselves could leave the tenant with no admin at all.
      if (id === req.user?.userId) {
        res.status(400).json({ success: false, message: 'You cannot change your own role.' });
        return;
      }

      const target = await prisma.user.findFirst({ where: { id, tenantId }, select: { role: true } });
      if (target?.role === 'SUPER_ADMIN') {
        res.status(403).json({ success: false, message: 'Super admin roles cannot be changed from a tenant.' });
        return;
      }

      const updated = await userRepository.updateRole(id, tenantId, result.data.role);
      
      if (!updated) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      res.status(200).json({ success: true, data: updated, message: 'User role updated' });
    } catch (err) {
      next(err);
    }
  };
}

export const usersController = new UsersController();
