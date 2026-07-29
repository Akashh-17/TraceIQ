import { DetectionSeverity } from '@prisma/client';
import Redis from 'ioredis';

// Represents the incoming event data from the BullMQ queue
export interface AuditEventJobData {
  tenantId: string;
  actor: string;
  action: string;
  resourceType: string;
  resourceId: string;
  sourceService: string;
  metadata?: Record<string, any>;
  id?: string; // The generated event ID
}

export interface DetectionContext {
  redisClient: Redis;
  tenantId: string;
  actor: string;
  eventId: string; // The ID of the event currently being processed
}

export interface TriggerResult {
  ruleName: string;
  ruleDescription: string;
  severity: DetectionSeverity;
  actor: string;
  supportingEventIds: string[];
  metadata?: Record<string, any>;
}

export interface DetectionRule {
  name: string;
  description: string;
  severity: DetectionSeverity;
  enabled: boolean;
  // Evaluates the event. Returns TriggerResult if triggered, null otherwise.
  evaluate: (event: AuditEventJobData, ctx: DetectionContext) => Promise<TriggerResult | null>;
}
