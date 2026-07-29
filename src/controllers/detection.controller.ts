import { Request, Response, NextFunction } from 'express';
import { DetectionQuerySchema, UpdateDetectionStatusSchema } from '../types/query.types';
import { detectionService } from '../services/detection.service';

export class DetectionController {
  
  // GET /api/v1/detections
  queryDetections = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId || req.tenant?.id;
      if (!tenantId) {
        res.status(401).json({ success: false, message: 'Tenant context missing' });
        return;
      }

      const result = DetectionQuerySchema.safeParse(req.query);

      if (!result.success) {
        const errors = result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));
        res.status(400).json({ success: false, message: 'Query validation failed', errors });
        return;
      }

      const { detections, nextCursor, hasMore } = await detectionService.queryDetections(
        result.data,
        tenantId
      );

      res.status(200).json({
        success: true,
        data: detections,
        message: 'Detections retrieved successfully',
        meta: {
          limit: result.data.limit,
          hasMore,
          nextCursor,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  // PATCH /api/v1/detections/:id/status
  updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId || req.tenant?.id;
      if (!tenantId) {
        res.status(401).json({ success: false, message: 'Tenant context missing' });
        return;
      }

      const id = req.params['id'] as string;
      const result = UpdateDetectionStatusSchema.safeParse(req.body);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: result.error.issues,
        });
        return;
      }

      const updated = await detectionService.updateStatus(id, tenantId, result.data.status);

      if (!updated) {
        res.status(404).json({ success: false, message: 'Detection not found' });
        return;
      }

      res.status(200).json({
        success: true,
        data: updated,
        message: 'Detection status updated',
      });
    } catch (err) {
      next(err);
    }
  };
}

export const detectionController = new DetectionController();
