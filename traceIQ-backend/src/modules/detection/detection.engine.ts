import Redis from 'ioredis';
import { AuditEventJobData, DetectionContext } from './detection.types';
import { detectionRules } from './detection.rules';
import { detectionRepository } from '../../models/detection.repository';
import { webhookService } from '../../services/webhook.service';
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

          const saved = await detectionRepository.saveDetection({
            ruleName: triggerResult.ruleName,
            ruleDescription: triggerResult.ruleDescription,
            severity: triggerResult.severity,
            actor: triggerResult.actor,
            tenantId: event.tenantId,
            supportingEventIds: triggerResult.supportingEventIds,
            metadata: triggerResult.metadata
          });

          // Fire webhook asynchronously — failures are logged but never block detection saving
          webhookService.fire(event.tenantId, saved);
        }
      } catch (error) {
        // We log the error but don't stop evaluating other rules
        // pino only serializes Error objects under the `err` key; `{ error }` logs as {}.
        logger.error({ err: error }, `Error evaluating detection rule ${rule.name}`);
      }
    }
  }
}
