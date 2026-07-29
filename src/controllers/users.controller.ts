import { Request, Response, NextFunction } from 'express';
import { userRepository } from '../models/user.repository';
import { authService } from '../services/auth.service';
import { RegisterUserSchema } from '../types/auth.types';
import { AppError } from '../middlewares/errorHandler';
import { z } from 'zod/v4';

const UpdateRoleSchema = z.object({
  role: z.enum(['VIEWER', 'ANALYST', 'AUDITOR', 'TENANT_ADMIN', 'SUPER_ADMIN']),
});

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

      if (!result.success) {
        res.status(400).json({ success: false, message: 'Validation failed', errors: result.error.issues });
        return;
      }

      // We reuse authService.register to handle password hashing and creation
      const user = await authService.register(result.data);
      res.status(201).json({ success: true, data: user });
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
