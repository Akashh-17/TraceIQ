import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middlewares/errorHandler';
import { prisma } from '../config/prisma';

export class ActorsController {

  // GET /api/v1/actors/:actor
  getActorProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId || req.tenant?.id;
      if (!tenantId) throw new AppError('Tenant context missing', 401);

      const actorEmail = req.params['actor'] as string;
      if (!actorEmail) throw new AppError('Actor email is required', 400);

      // Run all queries in parallel — no need to wait serially
      const [totalEvents, servicesRaw, detectionsRaw, firstLast, topActionsRaw, recentEvents] =
        await Promise.all([
          // Total event count
          prisma.auditEvent.count({
            where: { tenantId, actor: actorEmail },
          }),
          // Unique services this actor touched
          prisma.auditEvent.findMany({
            where: { tenantId, actor: actorEmail },
            select: { sourceService: true },
            distinct: ['sourceService'],
          }),
          // All detections (for count)
          prisma.detection.findMany({
            where: { tenantId, actor: actorEmail },
            select: { severity: true, status: true },
          }),
          // First and last seen timestamps
          prisma.auditEvent.aggregate({
            where: { tenantId, actor: actorEmail },
            _min: { createdAt: true },
            _max: { createdAt: true },
          }),
          // Top 5 most frequent actions with their counts
          prisma.auditEvent.groupBy({
            by: ['action'],
            where: { tenantId, actor: actorEmail },
            _count: { action: true },
            orderBy: { _count: { action: 'desc' } },
            take: 5,
          }),
          // Last 5 events for the recent activity list
          prisma.auditEvent.findMany({
            where: { tenantId, actor: actorEmail },
            select: { id: true, action: true, resourceType: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 5,
          }),
        ]);

      if (totalEvents === 0) {
        res.status(404).json({ success: false, message: 'Actor not found' });
        return;
      }

      const profile = {
        actor: actorEmail,
        totalEvents,
        firstSeen: firstLast._min?.createdAt || null,
        lastSeen: firstLast._max?.createdAt || null,
        services: servicesRaw.map(s => s.sourceService),
        totalDetections: detectionsRaw.length,
        // Fields the frontend ActorProfilePage expects
        uniqueActions: topActionsRaw.length, // count of distinct action types
        recentEvents,
        topActions: topActionsRaw.map(a => ({
          action: a.action,
          count: a._count.action,
        })),
      };

      res.status(200).json({ success: true, data: profile });
    } catch (err) {
      next(err);
    }
  };
}

export const actorsController = new ActorsController();
