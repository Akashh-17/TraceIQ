// src/services/query.service.ts
//
// WHY THIS FILE EXISTS:
// =====================
// The events.service.ts is the PRODUCER service — its job is pushing events into BullMQ.
// We create a separate query.service.ts for READ operations because the concerns are different:
//   - Write path: API → Queue → Worker → DB  (asynchronous, 202 response)
//   - Read path:  API → Service → Repository → DB  (synchronous, 200 response)
//
// Separating these keeps each service focused on one responsibility.
// The QueryService handles all read-side business logic:
//   - Constructs the FindEventsInput that the repository expects
//   - Implements the hasMore / nextCursor detection logic for cursor pagination
//   - Does NOT know about HTTP (no req/res) — stays reusable and testable
//
// Architecture flow (Read path, Phase 7):
//   Request → authMiddleware → Controller → QueryService → EventRepository → Prisma → PostgreSQL
//
// Cache exceptions:
//   - queryEvents: NOT cached (dynamic filters — too many combinations to cache per key)
//   - getEventById: NOT cached (UUIDs are unique, rarely hit twice — not worth caching)
//   - getDashboardStats: Cached in the Controller (same pattern as Phase 6 getStats)

import { eventRepository } from '../models/event.repository';
import { AuditEvent } from '@prisma/client';
import { EventQueryDto } from '../types/query.types';

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSE SHAPE: QueryResult
// ─────────────────────────────────────────────────────────────────────────────
// This is what queryEvents() returns to the controller.
// The controller wraps it in the standard ApiResponse envelope.
//
// Why define this here and not in common.types.ts?
// Because it's specific to this service's output — generic types belong in common.types.ts,
// domain-specific output shapes belong close to the code that produces them.
export interface QueryResult {
  events:     AuditEvent[];
  nextCursor: string | null; // null = no more pages
  hasMore:    boolean;
}

export class QueryService {

  // ── GET /api/v1/events ─────────────────────────────────────────────────────
  //
  // queryEvents: the core query engine for Phase 7.
  //
  // RESPONSIBILITY:
  //   1. Map the incoming DTO (validated query params) → repository input shape
  //   2. Implement hasMore detection (fetch limit+1 trick)
  //   3. Calculate nextCursor from the last row of the result
  //   4. Return a clean QueryResult to the controller
  //
  // WHY fetch limit+1?
  //   The client asks for 'limit' events. We ask the DB for 'limit+1'.
  //   If we get limit+1 rows back, a next page definitely exists.
  //   We return only 'limit' rows to the client + hasMore: true + nextCursor.
  //   If we get 'limit' or fewer rows, it's the last page. hasMore: false. nextCursor: null.
  //   This detection requires zero extra COUNT queries — no additional DB round-trip.
  async queryEvents(dto: EventQueryDto, tenantId: string): Promise<QueryResult> {
    const limit = dto.limit; // already validated (1–100) and defaulted (20) by Zod

    // Fetch one extra row to detect whether a next page exists
    const rows = await eventRepository.findMany({
      tenantId,

      // Map snake_case query param names → camelCase repository field names
      // The HTTP convention is snake_case (resource_type); TypeScript uses camelCase
      actor:         dto.actor,
      action:        dto.action,
      resourceType:  dto.resource_type,
      resourceId:    dto.resource_id,
      sourceService: dto.source_service,
      fromDate:      dto.from,
      toDate:        dto.to,
      cursor:        dto.cursor,
      sort:          dto.sort,

      // The +1 trick: fetch one more than the client needs
      // This tells us if there is a next page WITHOUT running a COUNT query
      limit: limit + 1,
    });

    // Detect: did we get more rows than the client asked for?
    const hasMore = rows.length > limit;

    // If hasMore, slice off the extra row — client only gets 'limit' rows
    // If not hasMore, return all rows (they are fewer than or equal to limit)
    const events = hasMore ? rows.slice(0, limit) : rows;

    // nextCursor = the ID of the LAST row in the result the client receives.
    // On the next request, the client sends this cursor back.
    // Prisma uses it to jump directly to the row after this one.
    // null means "there is no next page — stop paginating"
    const nextCursor = hasMore ? events[events.length - 1].id : null;

    return { events, nextCursor, hasMore };
  }

  // ── GET /api/v1/events/:id ─────────────────────────────────────────────────
  //
  // getEventById: single event lookup with tenant isolation.
  //
  // CRITICAL: We pass BOTH the event ID and the tenantId to the repository.
  // The repository uses findFirst({ where: { id, tenantId } }) — not findUnique({ id }).
  //
  // WHY? Security: findUnique({ id }) would return the event regardless of which
  // tenant it belongs to. A tenant could enumerate IDs and read another tenant's events.
  //
  // By requiring the ID AND the tenantId to match, we guarantee:
  //   "This event exists" AND "This event belongs to YOUR tenant"
  // If either condition fails, we return null → controller returns 404.
  // The caller never learns whether the event exists in another tenant's data.
  //
  // This pattern is called: "Ownership check at the database layer"
  // It is safer than checking ownership in the service after fetching.
  async getEventById(id: string, tenantId: string): Promise<AuditEvent | null> {
    return eventRepository.findById(id, tenantId);
  }
}

export const queryService = new QueryService();
