import { Router } from 'express';
import { detectionController } from '../controllers/detection.controller';
import { jwtAuthMiddleware } from '../middlewares/jwtAuth.middleware';

const router = Router();

// GET /api/v1/detections — Paginated list of detections with filters
router.get('/', jwtAuthMiddleware, detectionController.queryDetections);

// PATCH /api/v1/detections/:id/status — Update detection status
router.patch('/:id/status', jwtAuthMiddleware, detectionController.updateStatus);

export default router;
