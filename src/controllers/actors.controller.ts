import { Request, Response, NextFunction } from 'express';
import { eventRepository } from '../models/event.repository';
import { detectionRepository } from '../models/detection.repository';
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

      // We need: total events, first seen, last seen, unique services
      const totalEvents = await prisma.auditEvent.count({
        where: { tenantId, actor: actorEmail },
      });

      if (totalEvents === 0) {
        res.status(404).json({ success: false, message: 'Actor not found' });
        return;
      }

      // Unique services
      const services = await prisma.auditEvent.findMany({
        where: { tenantId, actor: actorEmail },
        select: { sourceService: true },
        distinct: ['sourceService'],
      });

      // Detections for risk score
      const detections = await prisma.detection.findMany({
        where: { tenantId, actor: actorEmail },
        select: { severity: true, status: true },
      });

      let riskScore = 0;
      let activeHigh = 0;

      for (const d of detections) {
        if (d.status === 'OPEN') {
          if (d.severity === 'HIGH') {
            riskScore += 10;
            activeHigh++;
          } else if (d.severity === 'MEDIUM') {
            riskScore += 5;
          } else {
            riskScore += 1;
          }
        }
      }

      const firstLast = await prisma.auditEvent.aggregate({
        where: { tenantId, actor: actorEmail },
        _min: { createdAt: true },
        _max: { createdAt: true },
      });

      const profile = {
        actor: actorEmail,
        totalEvents,
        firstSeen: firstLast._min?.createdAt || null,
        lastSeen: firstLast._max?.createdAt || null,
        services: services.map(s => s.sourceService),
        riskScore,
        activeHigh,
        totalDetections: detections.length,
      };

      res.status(200).json({ success: true, data: profile });
    } catch (err) {
      next(err);
    }
  };
}

export const actorsController = new ActorsController();
