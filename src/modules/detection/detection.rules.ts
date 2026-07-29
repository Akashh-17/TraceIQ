import { DetectionRule, AuditEventJobData, DetectionContext, TriggerResult } from './detection.types';

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
      // Add the current event ID to the list
      await ctx.redisClient.lpush(redisKey, ctx.eventId);
      // Expire the list in 10 minutes (600 seconds)
      await ctx.redisClient.expire(redisKey, 600);

      // Check how many failures exist in the 10-minute window
      const failureCount = await ctx.redisClient.llen(redisKey);

      if (failureCount >= 5) {
        // Fetch the event IDs that triggered this
        const supportingEventIds = await ctx.redisClient.lrange(redisKey, 0, -1);
        
        // Debounce: prevent triggering again for the same actor for 15 mins
        const debounceKey = `debounce:bruteforce:${ctx.tenantId}:${ctx.actor}`;
        const hasTriggered = await ctx.redisClient.get(debounceKey);
        if (hasTriggered) return null; // Already triggered recently

        await ctx.redisClient.setex(debounceKey, 900, '1'); // 15 min debounce
        
        return {
          ruleName: 'MULTIPLE_FAILED_LOGINS',
          ruleDescription: 'Actor exceeded 5 failed login attempts in 10 minutes.',
          severity: 'HIGH',
          actor: ctx.actor,
          supportingEventIds,
          metadata: { failureCount }
        };
      }
      return null;
    }
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
        return {
          ruleName: 'BULK_DATA_EXPORT',
          ruleDescription: `Actor exported ${recordsCount} records at once.`,
          severity: 'MEDIUM',
          actor: ctx.actor,
          supportingEventIds: [ctx.eventId],
          metadata: { recordsCount }
        };
      }
      return null;
    }
  },

  // 3. After-Hours Admin Access (Stateless, time-based)
  {
    name: 'AFTER_HOURS_ADMIN_ACTIVITY',
    description: 'Detects admin activity outside standard business hours (8 AM - 6 PM).',
    severity: 'LOW',
    enabled: true,
    evaluate: async (event: AuditEventJobData, ctx: DetectionContext): Promise<TriggerResult | null> => {
      // In a real system, you would look up the user's role.
      // For this student project, we'll assume the role is passed in metadata or we check a specific action
      const role = event.metadata?.role;
      if (role !== 'ADMIN') return null;

      const currentHour = new Date().getHours();
      if (currentHour < 8 || currentHour > 18) {
        return {
          ruleName: 'AFTER_HOURS_ADMIN_ACTIVITY',
          ruleDescription: `Admin activity detected at hour ${currentHour}.`,
          severity: 'LOW',
          actor: ctx.actor,
          supportingEventIds: [ctx.eventId],
          metadata: { hourOfDay: currentHour }
        };
      }
      return null;
    }
  }
];
