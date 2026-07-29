import { detectionRepository } from '../models/detection.repository';
import { DetectionQueryDto } from '../types/query.types';
import { DetectionStatus } from '@prisma/client';

export class DetectionService {
  /**
   * Retrieves a paginated list of detections for a tenant.
   */
  async queryDetections(query: DetectionQueryDto, tenantId: string) {
    // We request limit + 1 to detect if there is a next page
    const limit = query.limit;
    const fetchLimit = limit + 1;

    const detections = await detectionRepository.findMany({
      tenantId,
      actor: query.actor,
      severity: query.severity,
      status: query.status,
      cursor: query.cursor,
      limit: fetchLimit,
    });

    // Check if we got more items than requested
    const hasMore = detections.length > limit;
    
    // If so, slice off the extra item before returning
    const results = hasMore ? detections.slice(0, limit) : detections;

    // The cursor for the next page is the ID of the last item in this page
    const nextCursor = results.length > 0 ? results[results.length - 1].id : null;

    return { detections: results, nextCursor, hasMore };
  }

  /**
   * Updates a detection's status.
   */
  async updateStatus(id: string, tenantId: string, status: DetectionStatus) {
    const updated = await detectionRepository.updateStatus(id, tenantId, status);
    return updated;
  }
}

export const detectionService = new DetectionService();
