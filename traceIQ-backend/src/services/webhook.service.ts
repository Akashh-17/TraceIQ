import { webhookRepository } from '../models/webhook.repository';
import { logger } from '../config/logger';

interface DetectionPayload {
  id: string;
  ruleName: string;
  ruleDescription: string;
  severity: string;
  actor: string;
  triggeredAt: Date;
}

export class WebhookService {
  // Called automatically by the detection engine after every new detection.
  // Fire-and-forget: we log failures but never let them crash the detection flow.
  async fire(tenantId: string, detection: DetectionPayload): Promise<void> {
    const config = await webhookRepository.findByTenantId(tenantId);
    if (!config || !config.isActive) return;

    const payload = {
      event: 'detection.created',
      detection: {
        id:              detection.id,
        ruleName:        detection.ruleName,
        ruleDescription: detection.ruleDescription,
        severity:        detection.severity,
        actor:           detection.actor,
        triggeredAt:     detection.triggeredAt,
      },
      timestamp: new Date().toISOString(),
    };

    try {
      const response = await fetch(config.url, {
        method:  'POST',
        headers: {
          'Content-Type':    'application/json',
          'X-TraceIQ-Event': 'detection.created',
        },
        body:   JSON.stringify(payload),
        signal: AbortSignal.timeout(5000), // 5s timeout — don't block the worker
      });

      if (!response.ok) {
        logger.warn({ tenantId, url: config.url, status: response.status }, 'Webhook returned non-2xx');
      } else {
        logger.info({ tenantId, ruleName: detection.ruleName }, 'Webhook delivered');
      }
    } catch (err) {
      logger.error({ tenantId, url: config.url, err }, 'Webhook delivery failed');
    }
  }

  getConfig(tenantId: string) {
    return webhookRepository.findByTenantId(tenantId);
  }

  upsert(tenantId: string, url: string) {
    return webhookRepository.upsert(tenantId, url);
  }

  delete(tenantId: string) {
    return webhookRepository.delete(tenantId);
  }

  // Sends a fake detection so the user can verify their endpoint is reachable.
  async sendTest(tenantId: string) {
    const config = await webhookRepository.findByTenantId(tenantId);
    if (!config) throw new Error('No webhook URL configured');

    const payload = {
      event: 'detection.test',
      detection: {
        id:              'test-00000000-0000-0000-0000-000000000000',
        ruleName:        'WEBHOOK_TEST',
        ruleDescription: 'This is a test payload sent from TraceIQ.',
        severity:        'LOW',
        actor:           'system@traceiq.io',
        triggeredAt:     new Date(),
      },
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(config.url, {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'X-TraceIQ-Event': 'detection.test',
      },
      body:   JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Endpoint returned ${response.status} ${response.statusText}`);
    }

    return { delivered: true, status: response.status };
  }
}

export const webhookService = new WebhookService();
