import { Request, Response, NextFunction } from 'express';
import { tenantRepository } from '../models/tenant.repository';
import { AppError } from '../middlewares/errorHandler';
import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { hashApiKey } from '../utils/hash.utils';

export class ApiKeysController {
  
  // GET /api/v1/api-keys
  listApiKeys = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId || req.tenant?.id;
      if (!tenantId) throw new AppError('Tenant context missing', 401);

      const tenant = await tenantRepository.findById(tenantId);
      if (!tenant) {
        res.status(404).json({ success: false, message: 'Tenant not found' });
        return;
      }

      // Show only a masked prefix — the real key is stored hashed
      const keyPrefix = `tk_live_...${tenant.apiKey.substring(0, 8)}`;

      const keys = [
        {
          id: 'primary',
          name: 'Primary API Key',
          keyPrefix,
          isActive: true,
          createdAt: tenant.createdAt,
        }
      ];

      res.status(200).json({ success: true, data: keys });
    } catch (err) {
      next(err);
    }
  };

  // POST /api/v1/api-keys/roll
  rollApiKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId || req.tenant?.id;
      if (!tenantId) throw new AppError('Tenant context missing', 401);

      const newRawKey = `tk_live_${crypto.randomBytes(16).toString('hex')}`;
      const hashedKey = hashApiKey(newRawKey);
      
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { apiKey: hashedKey },
      });

      res.status(200).json({ success: true, message: 'API key rolled successfully', plainKey: newRawKey });
    } catch (err) {
      next(err);
    }
  };
}

export const apiKeysController = new ApiKeysController();
