// src/controllers/dashboard.controller.ts
//
// WHY A SEPARATE CONTROLLER FILE?
// ================================
// The events.controller.ts handles event-specific operations: ingest, query, find by ID, recent.
// The dashboard has different concerns: aggregations, stats, summary metrics.
//
// Separating them keeps each controller focused on one domain.
// When you add more dashboard endpoints (trends, activity graphs, exports summary)
// in future phases, they belong here — not in events.controller.ts.
//
// This controller follows the EXACT SAME Cache-Aside pattern as Phase 6.
// The pattern is already established — we are simply applying it to a new endpoint.
//
// Phase 6 pattern (already built):
//   Check cache → HIT: return from Redis → MISS: query PostgreSQL → cache it → return
//
// Phase 7 reuses the same pattern here for GET /api/v1/dashboard/stats.
// This is intentional architecture: consistent patterns across the codebase
// make it easier to onboard new developers and easier to debug.

import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cache.service';
import { eventRepository } from '../models/event.repository';
import { detectionRepository } from '../models/detection.repository';
import { AppError } from '../middlewares/errorHandler';

export class DashboardController {

  // GET /api/v1/dashboard/stats
  //
  // Returns aggregated statistics for the authenticated tenant's dashboard.
  // Expensive aggregation queries are cached in Redis for 60 seconds.
  //
  // Response shape:
  //   totalEvents       — total count of all events for this tenant
  //   eventsToday       — count of events since 00:00:00 today (UTC)
  //   failedLoginsToday — count of LOGIN_FAILED events today
  //   topActors         — top 5 actors by event count (for the actor leaderboard widget)
  //   topActions        — top 5 actions by event count (for the action breakdown widget)
  //
  // WHY does this live in a dashboard controller and not events controller?
  //   The /events endpoints deal with individual event records.
  //   The /dashboard endpoints deal with aggregated summaries.
  //   Different concerns → different controllers.
  //
  // CACHE-ASIDE FLOW (same as Phase 6):
  //   Step 1: Check Redis for this tenant's cached stats
  //   Step 2: Cache HIT  → return immediately (microseconds, not milliseconds)
  //   Step 3: Cache MISS → run aggregation queries against PostgreSQL
  //   Step 4: Store the result in Redis with 60-second TTL
  //   Step 5: Return the freshly computed stats
  //
  // WITHOUT caching, every dashboard load runs 5 separate GROUP BY + COUNT queries.
  // On a table with 5 million rows, these queries take seconds each.
  // With caching, 59 of every 60 requests return in microseconds from Redis.
  getDashboardStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Safely extract tenantId whether it came from JWT (req.user) or API Key (req.tenant)
      const tenantId = req.user?.tenantId || req.tenant?.id;
      
      if (!tenantId) {
        throw new AppError('Tenant context missing from request', 401);
      }

      // ── Step 1: Check Redis cache ──────────────────────────────────────────
      // cacheService.getStats() returns the parsed stats object or null.
      // The cache key is: traceiq:cache:stats:{tenantId}
      // Tenant isolation is automatic — each tenant has its own cache key.
      const cached = await cacheService.getStats(tenantId);

      if (cached) {
        // Cache HIT: return immediately without touching PostgreSQL.
        // meta.source = 'cache' is useful for debugging and monitoring.
        // In production, you would track cache hit rate in your metrics system.
        res.status(200).json({
          success: true,
          data:    cached,
          message: 'Dashboard stats retrieved successfully',
          meta:    { source: 'cache' },
        });
        return;
      }

      // ── Step 2: Cache MISS — query PostgreSQL ──────────────────────────────
      // eventRepository.getStats() runs 5 queries in parallel (Promise.all internally).
      // Each query is a COUNT or GROUP BY aggregation on audit_events.
      // This is the expensive path — it should only run once every 60 seconds per tenant.
      const stats = await eventRepository.getStats(tenantId);

      // ── Step 3: Populate the cache ─────────────────────────────────────────
      // Store the result in Redis with 60-second TTL.
      // The NEXT 59 requests will hit the cache, not the database.
      // After 60 seconds, the cache expires and the next request recomputes it.
      // (Cache invalidation also happens in the Worker after each new event — Phase 6)
      await cacheService.setStats(tenantId, stats);

      // ── Step 4: Return the computed stats ──────────────────────────────────
      res.status(200).json({
        success: true,
        data:    stats,
        message: 'Dashboard stats retrieved successfully',
        meta:    { source: 'database' },
      });

    } catch (err) {
      next(err); // passes to globalErrorHandler in errorHandler.ts
    }
  };

  getTrends = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId || req.tenant?.id;
      if (!tenantId) throw new AppError('Tenant context missing', 401);

      const trends = await eventRepository.getTrends(tenantId);
      res.status(200).json({ success: true, data: trends });
    } catch (err) {
      next(err);
    }
  };

  getDetectionTrend = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId || req.tenant?.id;
      if (!tenantId) throw new AppError('Tenant context missing', 401);

      const trends = await detectionRepository.getTrendByDay(tenantId);
      res.status(200).json({ success: true, data: trends });
    } catch (err) {
      next(err);
    }
  };
}

export const dashboardController = new DashboardController();
