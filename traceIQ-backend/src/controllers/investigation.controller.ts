import { Request, Response, NextFunction } from 'express';
import { aiOrchestratorService } from '../modules/ai/services/ai-orchestrator.service';
import { investigationRepository } from '../models/investigation.repository';
import { z } from 'zod';

const investigateSchema = z.object({
  query: z.string().min(5).max(500),
  actor: z.string().optional(),
});

export const investigate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Tenant context missing.' });
      return;
    }

    const { query, actor } = investigateSchema.parse(req.body);

    const report = await aiOrchestratorService.investigate(tenantId, query);

    // Persist the completed investigation — fire and forget pattern:
    // we don't await this so the response isn't delayed by the DB write.
    investigationRepository.save({
      tenantId,
      query,
      actor: actor ?? null,
      summary:         report?.summary         ?? '',
      findings:        report?.findings        ?? [],
      recommendations: report?.recommendations ?? [],
    }).catch(() => {
      // Non-fatal — the user still gets their report even if persistence fails.
    });

    res.status(200).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

export const listInvestigations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Tenant context missing.' });
      return;
    }

    const limit = Math.min(Number(req.query['limit']) || 20, 50);
    const cursor = req.query['cursor'] as string | undefined;

    const rows = await investigationRepository.findMany(tenantId, limit, cursor);
    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;

    res.status(200).json({
      success: true,
      data,
      meta: {
        hasMore,
        nextCursor: hasMore ? data[data.length - 1]?.id : undefined,
      },
    });
  } catch (error) {
    next(error);
  }
};
