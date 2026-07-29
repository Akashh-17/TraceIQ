// src/services/cache.service.ts
//
// Cache Service — Redis Caching Abstraction
// ==========================================
// Why this file exists:
// We use the Cache-Aside pattern throughout TraceIQ.
// Instead of scattering raw Redis.get/set/del calls across controllers and workers,
// we centralize all cache logic here. This file is the single place that knows:
//   - How keys are named
//   - What the TTL is for each type of data
//   - How to serialize/deserialize data
//
// Architecture note:
// The CacheService does NOT touch PostgreSQL. It only talks to Redis.
// If the cache is cold (miss), the CALLER (repository/controller) is responsible
// for fetching from PostgreSQL and calling CacheService.set() to warm it up.
//
// Key naming convention: traceiq:cache:{type}:{tenantId}
// Namespaced keys prevent collisions with BullMQ's "bull:*" keys.

import { redisClient } from '../config/redis';
import { AuditEvent } from '@prisma/client';
import { cacheLogger } from '../config/logger';

// TTL constants — centralized so changing cache duration is a one-line change
const TTL = {
  RECENT_EVENTS: 60,   // seconds — dashboard refreshes every 3s, 60s is fine
  STATS:         60,   // seconds — stats don't need real-time accuracy
} as const;

// Cache key factory — one place that defines our key structure.
// Always include tenantId: FinStack's cache must never bleed into MedVault's.
const KEYS = {
  recentEvents: (tenantId: string) => `traceiq:cache:recent:${tenantId}`,
  stats:        (tenantId: string) => `traceiq:cache:stats:${tenantId}`,
} as const;

// Shape of the stats object we cache
export interface TenantStats {
  totalEvents:       number;
  eventsToday:       number;
  topActors:         Array<{ actor: string; count: number }>;
  topActions:        Array<{ action: string; count: number }>;
  failedLoginsToday: number;
}

export class CacheService {

  // ── Recent Events ────────────────────────────────────────────────────────────

  async getRecentEvents(tenantId: string): Promise<AuditEvent[] | null> {
    try {
      const raw = await redisClient.get(KEYS.recentEvents(tenantId));
      if (!raw) return null; // Cache miss — caller must query PostgreSQL
      return JSON.parse(raw) as AuditEvent[];
    } catch (err: any) {
      // Graceful degradation: Redis failure should not crash the request.
      // Log the warning, return null (treat as cache miss).
      cacheLogger.warn({ err: err.message, tenantId }, 'Failed to read recent events from cache');
      return null;
    }
  }

  async setRecentEvents(tenantId: string, events: AuditEvent[]): Promise<void> {
    try {
      await redisClient.set(
        KEYS.recentEvents(tenantId),
        JSON.stringify(events),
        'EX',
        TTL.RECENT_EVENTS
      );
    } catch (err: any) {
      cacheLogger.warn({ err: err.message, tenantId }, 'Failed to write recent events to cache');
      // Do not throw. A cache write failure shouldn't fail the overall API request.
    }
  }

  // ── Dashboard Stats ──────────────────────────────────────────────────────────

  async getStats(tenantId: string): Promise<TenantStats | null> {
    try {
      const raw = await redisClient.get(KEYS.stats(tenantId));
      if (!raw) return null;
      return JSON.parse(raw) as TenantStats;
    } catch (err: any) {
      cacheLogger.warn({ err: err.message, tenantId }, 'Failed to read stats from cache');
      return null;
    }
  }

  async setStats(tenantId: string, stats: TenantStats): Promise<void> {
    try {
      await redisClient.set(
        KEYS.stats(tenantId),
        JSON.stringify(stats),
        'EX',
        TTL.STATS
      );
    } catch (err: any) {
      cacheLogger.warn({ err: err.message, tenantId }, 'Failed to write stats to cache');
    }
  }

  // ── Cache Invalidation ───────────────────────────────────────────────────────
  //
  // Called by the Worker after successfully writing a new event to PostgreSQL.
  // Deletes the tenant's cache keys so the next read fetches fresh data.
  async invalidateTenant(tenantId: string): Promise<void> {
    try {
      await redisClient.del(
        KEYS.recentEvents(tenantId),
        KEYS.stats(tenantId)
      );
    } catch (err: any) {
      cacheLogger.warn({ err: err.message, tenantId }, 'Failed to invalidate cache for tenant');
    }
  }
}

export const cacheService = new CacheService();
