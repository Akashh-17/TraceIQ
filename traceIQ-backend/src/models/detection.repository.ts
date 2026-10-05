import { DetectionSeverity, DetectionStatus } from '@prisma/client';
import { prisma } from '../config/prisma';

export type SaveDetectionInput = {
  ruleName: string;
  ruleDescription: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  actor: string;
  tenantId: string;
  supportingEventIds: string[];
  metadata?: Record<string, any>;
};

export type FindDetectionsInput = {
  tenantId:  string;
  actor?:    string;
  severity?: DetectionSeverity;
  status?:   DetectionStatus;
  fromDate?: Date;
  toDate?:   Date;
  limit?:    number;
  cursor?:   string;
};

export class DetectionRepository {
  /**
   * Saves a triggered detection to the database.
   */
  async saveDetection(data: SaveDetectionInput) {
    return prisma.detection.create({
      data: {
        ruleName: data.ruleName,
        ruleDescription: data.ruleDescription,
        severity: data.severity,
        actor: data.actor,
        tenantId: data.tenantId,
        supportingEventIds: data.supportingEventIds,
        metadata: data.metadata || {},
        status: 'OPEN',
      }
    });
  }

  /**
   * Retrieves paginated detections for a tenant with optional filters.
   */
  async findMany(input: FindDetectionsInput) {
    const limit = input.limit ?? 25;

    return prisma.detection.findMany({
      where: {
        tenantId: input.tenantId,
        ...(input.actor    && { actor: input.actor }),
        ...(input.severity && { severity: input.severity }),
        ...(input.status   && { status: input.status }),
        ...(input.fromDate || input.toDate ? {
          triggeredAt: {
            ...(input.fromDate && { gte: input.fromDate }),
            ...(input.toDate   && { lte: input.toDate }),
          },
        } : {}),
      },
      orderBy: { triggeredAt: 'desc' },
      take: limit,
      ...(input.cursor && {
        skip:   1,
        cursor: { id: input.cursor },
      }),
    });
  }

  /**
   * Counts detections for summary stats (badge counts per severity/status).
   */
  async countBySeverityAndStatus(tenantId: string) {
    const [high, medium, low, open, acknowledged, resolved] = await Promise.all([
      prisma.detection.count({ where: { tenantId, severity: 'HIGH' } }),
      prisma.detection.count({ where: { tenantId, severity: 'MEDIUM' } }),
      prisma.detection.count({ where: { tenantId, severity: 'LOW' } }),
      prisma.detection.count({ where: { tenantId, status: 'OPEN' } }),
      prisma.detection.count({ where: { tenantId, status: 'ACKNOWLEDGED' } }),
      prisma.detection.count({ where: { tenantId, status: 'RESOLVED' } }),
    ]);
    return { high, medium, low, open, acknowledged, resolved };
  }

  /**
   * Updates the status of a detection (OPEN → ACKNOWLEDGED → RESOLVED).
   * Verifies tenant ownership before updating.
   */
  async updateStatus(id: string, tenantId: string, status: DetectionStatus) {
    // findFirst with tenantId check prevents cross-tenant updates
    const detection = await prisma.detection.findFirst({ where: { id, tenantId } });
    if (!detection) return null;

    return prisma.detection.update({
      where: { id },
      data:  { status },
    });
  }

  /**
   * Retrieves open detections for a specific actor (used by AI Agent).
   */
  async getOpenDetectionsForActor(tenantId: string, actor: string) {
    return prisma.detection.findMany({
      where: { tenantId, actor, status: 'OPEN' },
      orderBy: { triggeredAt: 'desc' },
      take: 10,
    });
  }

  /**
   * Detection count per day for the last N days, grouped by severity.
   * Used by the Dashboard Detection Trend chart.
   */
  async getTrendByDay(tenantId: string, days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const detections = await prisma.detection.findMany({
      where: {
        tenantId,
        triggeredAt: { gte: since },
      },
      select: { triggeredAt: true, severity: true },
      orderBy: { triggeredAt: 'asc' },
    });

    // Group by date string + severity
    const map: Record<string, { HIGH: number; MEDIUM: number; LOW: number }> = {};
    for (const d of detections) {
      const dateStr = d.triggeredAt.toISOString().split('T')[0]!;
      if (!map[dateStr]) map[dateStr] = { HIGH: 0, MEDIUM: 0, LOW: 0 };
      map[dateStr]![d.severity]++;
    }

    return Object.entries(map).map(([date, counts]) => ({ date, ...counts }));
  }
}

export const detectionRepository = new DetectionRepository();
