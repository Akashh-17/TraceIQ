import { DetectionRule, AuditEventJobData, DetectionContext, TriggerResult } from './detection.types';
import { prisma } from '../../config/prisma';

export const detectionRules: DetectionRule[] = [
  // 1. Brute Force Rule (Stateful)
  {
    name: 'MULTIPLE_FAILED_LOGINS',
    description: 'Detects 5 failed logins within 10 minutes from the same actor.',
    severity: 'HIGH',
    enabled: true,
    evaluate: async (event: AuditEventJobData, ctx: DetectionContext): Promise<TriggerResult | null> => {
      if (event.action !== 'LOGIN_FAILED') return null;

      const redisKey = `detect:bruteforce:${ctx.tenantId}:${ctx.actor}`;
      const now = Date.now();
      const windowStart = now - 10 * 60 * 1000; // 10 minutes ago

      // Add this event with its timestamp as the score
      await ctx.redisClient.zadd(redisKey, now, ctx.eventId);
      // Remove events that have aged out of the 10-minute window
      await ctx.redisClient.zremrangebyscore(redisKey, 0, windowStart);
      // Keep the key alive for one more window period
      await ctx.redisClient.expire(redisKey, 600);

      const failureCount = await ctx.redisClient.zcard(redisKey);

      if (failureCount >= 5) {
        const supportingEventIds = await ctx.redisClient.zrange(redisKey, 0, -1);

        // Debounce: prevent re-triggering for the same actor for 15 minutes
        const debounceKey = `debounce:bruteforce:${ctx.tenantId}:${ctx.actor}`;
        const hasTriggered = await ctx.redisClient.get(debounceKey);
        if (hasTriggered) return null;

        await ctx.redisClient.setex(debounceKey, 900, '1');

        return {
          ruleName: 'MULTIPLE_FAILED_LOGINS',
          ruleDescription: 'Actor exceeded 5 failed login attempts in 10 minutes.',
          severity: 'HIGH',
          actor: ctx.actor,
          supportingEventIds,
          metadata: { failureCount },
        };
      }
      return null;
    },
  },

  // 2. Bulk Data Export (Stateless)
  {
    name: 'BULK_DATA_EXPORT',
    description: 'Detects a data export involving more than 1000 records.',
    severity: 'MEDIUM',
    enabled: true,
    evaluate: async (event: AuditEventJobData, ctx: DetectionContext): Promise<TriggerResult | null> => {
      if (event.action !== 'DATA_EXPORTED') return null;

      const recordsCount = event.metadata?.recordsCount;
      if (typeof recordsCount === 'number' && recordsCount > 1000) {
        // Debounce: same actor can only trigger this once per hour
        const debounceKey = `debounce:bulk_export:${ctx.tenantId}:${ctx.actor}`;
        const alreadyFired = await ctx.redisClient.get(debounceKey);
        if (alreadyFired) return null;
        await ctx.redisClient.setex(debounceKey, 3600, '1');

        return {
          ruleName: 'BULK_DATA_EXPORT',
          ruleDescription: `Actor exported ${recordsCount} records at once.`,
          severity: 'MEDIUM',
          actor: ctx.actor,
          supportingEventIds: [ctx.eventId],
          metadata: { recordsCount },
        };
      }
      return null;
    },
  },

  // 3. After-Hours Admin Access (Stateless, time-based)
  {
    name: 'AFTER_HOURS_ADMIN_ACTIVITY',
    description: 'Detects admin activity outside standard business hours (8 AM - 6 PM).',
    severity: 'LOW',
    enabled: true,
    evaluate: async (event: AuditEventJobData, ctx: DetectionContext): Promise<TriggerResult | null> => {
      // Look up the actor's actual role from the database.
      // We never trust event.metadata.role because it is caller-controlled.
      const user = await prisma.user.findFirst({
        where: { email: ctx.actor, tenantId: ctx.tenantId },
        select: { role: true },
      });

      if (!user || (user.role !== 'TENANT_ADMIN' && user.role !== 'SUPER_ADMIN')) return null;

      const currentHour = new Date().getHours();
      if (currentHour < 8 || currentHour > 18) {
        return {
          ruleName: 'AFTER_HOURS_ADMIN_ACTIVITY',
          ruleDescription: `Admin activity detected at hour ${currentHour}.`,
          severity: 'LOW',
          actor: ctx.actor,
          supportingEventIds: [ctx.eventId],
          metadata: { hourOfDay: currentHour },
        };
      }
      return null;
    },
  },
];
