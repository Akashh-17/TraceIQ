import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { Permission } from '../types/rbac.types';
import { AppError } from './errorHandler';

/**
 * Middleware: requireRole
 * Ensures the logged-in user has one of the allowed roles.
 * 
 * Example usage: 
 * router.delete('/users/:id', requireRole([Role.SUPER_ADMIN, Role.TENANT_ADMIN]), controller);
 */
export const requireRole = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // 1. Ensure the user is actually logged in (jwtAuthMiddleware ran first)
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    // 2. Check if their role is in the allowed list
    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError('Forbidden: Insufficient role privileges', 403); // 403 means "I know who you are, but you can't do this"
    }

    // 3. User is allowed, proceed to the controller
    next();
  };
};

/**
 * Middleware: requirePermission
 * Ensures the logged-in user has the specific permission.
 * This is better than requireRole because it decouples the route from the role structure.
 * 
 * Example usage:
 * router.get('/export', requirePermission(Permission.EXPORT_EVENTS), controller);
 */
export const requirePermission = (requiredPermission: Permission) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    // The user's permissions were injected into the JWT during login!
    // No database lookup is required here. Highly performant.
    if (!req.user.permissions.includes(requiredPermission)) {
      throw new AppError(`Forbidden: Missing required permission [${requiredPermission}]`, 403);
    }

    next();
  };
};
