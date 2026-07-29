// src/controllers/events.controller.ts
//
// CONTROLLER — the HTTP boundary layer.
// Responsibility: handle the request, validate it, call the service, send the response.
// Nothing else. No SQL. No business logic. No queue logic.
//
// Phase 5: Controller unchanged — only the Service changed (queues instead of writes directly).
// Phase 6: Added getRecentEvents() and getStats() using Cache-Aside pattern.
// Phase 7: Added queryEvents() and getEventById() for the Query Engine APIs.
//          queryEvents validates req.query with EventQuerySchema (new in Phase 7).
//          getEventById returns 404 if not found or not owned by tenant.

import { Request, Response, NextFunction } from 'express';
import { CreateEventSchema } from '../types/event.types';
import { EventQuerySchema } from '../types/query.types';
import { eventsService } from '../services/events.service';
import { queryService } from '../services/query.service';
import { ApiResponse } from '../types/common.types';
import { cacheService } from '../services/cache.service';
import { eventRepository } from '../models/event.repository';

export class EventsController {

  // Arrow function (not a regular method) so 'this' is always bound correctly.
  // If you used a regular method and passed it to Express as a callback,
  // 'this' would be undefined at runtime.
  ingestEvent = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // safeParse never throws — it returns { success, data } or { success, error }
      const result = CreateEventSchema.safeParse(req.body);

      if (!result.success) {
        const errors = result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));
        res.status(400).json({ success: false, message: 'Validation failed', errors });
        return;
      }

      // tenantId source Phase 4+: req.tenant.id set by auth middleware
      // Because authMiddleware ran first, req.tenant is guaranteed to exist here.
      // If the API key was invalid, authMiddleware would have thrown a 401
      // and this controller code would never even execute.
      const tenantId = req.tenant.id;
      const data = await eventsService.createEvent(result.data, tenantId);

      const response: ApiResponse<{ queued: boolean }> = {
        success: true,
        data,
        message: 'Event accepted for processing',
      };

      // 202 Accepted — the event is now in the queue but may not be in the DB yet.
      // This is honest: we accepted the request, we did NOT create the DB row yet.
      // The Worker will handle the actual DB write in the background.
      res.status(202).json(response);

    } catch (err) {
      next(err); // passes to globalErrorHandler in errorHandler.ts
    }
  };

  // GET RECENT EVENTS — Cache-Aside implementation
  //
  // Flow: Check Redis → HIT: return cached → MISS: query PostgreSQL → cache it → return
  //
  // The controller orchestrates the cache logic because it has context about the request.
  // The CacheService and Repository are kept pure — neither knows about the other.
  getRecentEvents = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.tenant.id;

      // Step 1: Check the cache
      const cached = await cacheService.getRecentEvents(tenantId);
      if (cached) {
        res.status(200).json({
          success: true,
          data: cached,
          meta: { source: 'cache' },  // useful for debugging / monitoring
        });
        return;
      }

      // Step 2: Cache miss — query PostgreSQL
      const events = await eventRepository.findRecent(tenantId, 25);

      // Step 3: Populate the cache for future requests
      await cacheService.setRecentEvents(tenantId, events);

      res.status(200).json({
        success: true,
        data: events,
        meta: { source: 'database' },
      });
    } catch (err) {
      next(err);
    }
  };

  // GET STATS — dashboard statistics with Cache-Aside
  //
  // Stats require expensive aggregation queries (COUNT, GROUP BY) on audit_events.
  // Without caching, every dashboard load runs those queries.
  // With caching, they run once per 60 seconds regardless of how many users are active.
  getStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.tenant.id;

      // Step 1: Check the cache
      const cached = await cacheService.getStats(tenantId);
      if (cached) {
        res.status(200).json({
          success: true,
          data: cached,
          meta: { source: 'cache' },
        });
        return;
      }

      // Step 2: Cache miss — compute stats from PostgreSQL
      const stats = await eventRepository.getStats(tenantId);

      // Step 3: Cache the computed stats
      await cacheService.setStats(tenantId, stats);

      res.status(200).json({
        success: true,
        data: stats,
        meta: { source: 'database' },
      });
    } catch (err) {
      next(err);
    }
  };

  // ── PHASE 7: Query Engine ─────────────────────────────────────────────────────

  // GET /api/v1/events — Filtered, Sorted, Cursor-Paginated Event Query
  //
  // This is the main search API. The client sends any combination of filters
  // as query parameters. The controller's only job here is:
  //   1. Validate the query params with Zod (EventQuerySchema)
  //   2. Pass the validated DTO to the service
  //   3. Return the structured response with pagination metadata
  //
  // WHY validate query params with Zod?
  // req.query values are always strings. Zod coerces and validates them:
  //   ?limit=abc  → Zod rejects (not a number)
  //   ?limit=200  → Zod rejects (exceeds max 100)
  //   ?limit=20   → Zod accepts, coerces to number 20
  //   ?from=not-a-date → Zod rejects (bad ISO date format)
  //   ?cursor=not-a-uuid → Zod rejects (bad UUID format)
  //
  // WHY NOT cache this endpoint?
  // This endpoint has infinite filter combinations. Caching requires a unique cache key.
  // A key combining all possible filter permutations is impractical to manage.
  // The /recent and /stats endpoints are cached because they have NO dynamic filters.
  queryEvents = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.tenant.id;

      // Validate the query parameters.
      // safeParse does not throw — it returns { success, data } or { success, error }.
      // req.query contains the raw URL params as plain strings.
      const result = EventQuerySchema.safeParse(req.query);

      if (!result.success) {
        // Map Zod errors into a readable format for the API consumer.
        // Each item shows which query param failed and why.
        const errors = result.error.issues.map((issue) => ({
          field:   issue.path.join('.'),
          message: issue.message,
        }));
        res.status(400).json({
          success: false,
          message: 'Query validation failed',
          errors,
        });
        return;
      }

      // result.data is now fully typed as EventQueryDto — validated + coerced.
      // Pass it to the QueryService which handles the DB call and pagination logic.
      const { events, nextCursor, hasMore } = await queryService.queryEvents(
        result.data,
        tenantId
      );

      // PaginatedResponse shape (see common.types.ts):
      //   data      — the events array (max 'limit' items)
      //   meta      — pagination metadata the client needs to fetch the next page
      //     limit     — how many were requested (echoed back for client convenience)
      //     hasMore   — boolean: are there more events after this page?
      //     nextCursor — the ID to pass as ?cursor= on the next request (null if last page)
      res.status(200).json({
        success: true,
        data: events,
        message: 'Events retrieved successfully',
        meta: {
          limit:      result.data.limit,
          hasMore,
          nextCursor,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  // GET /api/v1/events/:id — Single Event Lookup
  //
  // Returns one specific event by its UUID.
  // MUST verify tenant ownership: a tenant can only read their own events.
  //
  // How tenant isolation works here:
  //   The repository's findById(id, tenantId) runs:
  //     SELECT ... WHERE id = ':id' AND tenant_id = ':tenantId'
  //   If the event belongs to a different tenant, this returns null (not a 403).
  //   We return 404 in that case — the caller never learns that the event exists.
  //   This prevents cross-tenant data discovery (an attacker cannot probe other tenants).
  //
  // 404 vs 403:
  //   - 403 Forbidden would confirm "this event exists but you can't see it".
  //   - 404 Not Found reveals nothing. Preferred for security-sensitive systems.
  getEventById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.tenant.id;
      // req.params.id is always a string in Express route params (:id captures one segment).
      // The explicit cast ensures TypeScript is satisfied in all tsconfig strictness levels.
      const id = req.params['id'] as string;

      // Fetch the event — repository enforces tenantId match at the DB layer
      const event = await queryService.getEventById(id, tenantId);

      if (!event) {
        // Return 404 regardless of whether the ID doesn't exist at all
        // or exists but belongs to a different tenant.
        // Both cases look identical to the caller.
        res.status(404).json({
          success: false,
          message: 'Event not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: event,
        message: 'Event retrieved successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  // GET /api/v1/events/:id/related
  getRelatedEvents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.tenant.id;
      const id = req.params['id'] as string;

      const events = await eventRepository.findRelatedEvents(tenantId, id);

      if (!events) {
        res.status(404).json({ success: false, message: 'Event not found' });
        return;
      }

      res.status(200).json({
        success: true,
        data: events,
        message: 'Related events retrieved successfully',
      });
    } catch (err) {
      next(err);
    }
  };
}

export const eventsController = new EventsController();