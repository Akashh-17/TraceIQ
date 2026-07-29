import { Request, Response, NextFunction } from 'express';
import { aiOrchestratorService } from '../modules/ai/services/ai-orchestrator.service';
import { z } from 'zod';

const investigateSchema = z.object({
  query: z.string().min(5).max(500),
});

export const investigate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // For human users, tenantId is in req.user. For M2M it is in req.tenantId.
    // For this endpoint, we assume it's protected by human auth, so req.user exists.
    const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Tenant context missing.' });
      return;
    }

    const { query } = investigateSchema.parse(req.body);

    const report = await aiOrchestratorService.investigate(tenantId, query);

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};
