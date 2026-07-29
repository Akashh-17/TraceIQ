import Redis from 'ioredis';
import { AuditEventJobData, DetectionContext } from './detection.types';
import { detectionRules } from './detection.rules';
import { detectionRepository } from '../../models/detection.repository';
import { logger } from '../../config/logger';

export class DetectionEngine {
  private redisClient: Redis;

  constructor(redisClient: Redis) {
    this.redisClient = redisClient;
  }

  /**
   * Evaluates an incoming audit event against all active detection rules.
   * If any rules are triggered, it saves the detection to the database.
   */
  async runDetections(event: AuditEventJobData) {
    if (!event.id) {
      logger.warn({ event }, 'Event missing ID. Skipping detections.');
      return;
    }

    const context: DetectionContext = {
      redisClient: this.redisClient,
      tenantId: event.tenantId,
      actor: event.actor,
      eventId: event.id
    };

    const activeRules = detectionRules.filter(rule => rule.enabled);

    for (const rule of activeRules) {
      try {
        const triggerResult = await rule.evaluate(event, context);
        
        if (triggerResult) {
          logger.info({ actor: triggerResult.actor, tenantId: event.tenantId }, `🚨 Detection Triggered: ${rule.name}`);
          
          await detectionRepository.saveDetection({
            ruleName: triggerResult.ruleName,
            ruleDescription: triggerResult.ruleDescription,
            severity: triggerResult.severity,
            actor: triggerResult.actor,
            tenantId: event.tenantId,
            supportingEventIds: triggerResult.supportingEventIds,
            metadata: triggerResult.metadata
          });
        }
      } catch (error) {
        // We log the error but don't stop evaluating other rules
        logger.error({ error }, `Error evaluating detection rule ${rule.name}`);
      }
    }
  }
}
