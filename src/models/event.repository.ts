// src/models/event.repository.ts
//
// REPOSITORY — the data access layer for AuditEvent.
// Phase 7 changes:
//   - FindEventsInput gets a 'sort' field (asc | desc) for the Query API
//   - findMany() now honours that sort direction instead of hardcoding 'desc'
//   - findById() already existed (Phase 3) — unchanged, used by GET /events/:id
// Responsibility: all Prisma calls for the audit_events table live here.
// Nothing else touches the database for this model.
//
// Think of it as the STORAGE CLERK:
//   - Knows exactly where things are stored and how to retrieve them
//   - Doesn't care about HTTP or business logic
//   - Speaks Prisma/SQL so the rest of the app doesn't have to
//
// WHY isolate DB calls here?
//   - Swap Prisma for raw SQL tomorrow → change only this file
//   - Unit test the service without a real DB → mock this file
//   - All queries for AuditEvent are in one place → easy to audit
//
// IMMUTABILITY: AuditEvents are never updated or deleted.
// No update() or delete() methods exist here on purpose.

import { prisma } from '../config/prisma';
import { Prisma, AuditEvent } from '@prisma/client';

// ── Input types ───────────────────────────────────────────────────────────────
// Defined manually so the service doesn't import Prisma types directly.
// The service talks to the repository in plain domain language.

export type CreateAuditEventInput = {
  tenantId: string;
  actor: string;
  action: string;
  resourceType: string;
  resourceId: string;
  sourceService: string;
  metadata?: Prisma.InputJsonValue;
  nlRepresentation?: string;
  embedding?: number[];
};

// All fields optional except tenantId — you always filter by tenant.
export type FindEventsInput = {
  tenantId: string;
  actor?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  sourceService?: string;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  cursor?: string; // cursor-based pagination: ID of last seen item
  // Phase 7: sort direction — 'asc' (oldest first) or 'desc' (newest first, default)
  // Audit dashboards default to 'desc' — you want to see what just happened.
  // Chronological replay (e.g. incident investigation) uses 'asc'.
  sort?: 'asc' | 'desc';
};

// ── Repository ────────────────────────────────────────────────────────────────

export class EventRepository {

  // INSERT one row into audit_events.
  // Phase 5+: this method is called exclusively from the background Worker.
  // The API no longer calls this directly — events go through the BullMQ queue first.
  async create(input: CreateAuditEventInput): Promise<AuditEvent> {
    return prisma.auditEvent.create({
      data: {
        tenantId:      input.tenantId,
        actor:         input.actor,
        action:        input.action,
        resourceType:  input.resourceType,
        resourceId:    input.resourceId,
        sourceService: input.sourceService,
        // Spreading undefined omits the field, leaving metadata NULL in the DB.
        ...(input.metadata !== undefined && { metadata: input.metadata }),
        ...(input.nlRepresentation !== undefined && { nlRepresentation: input.nlRepresentation }),
        ...(input.embedding !== undefined && { embedding: input.embedding }),
      },
    });
  }

  // SELECT one event by ID, scoped to a tenant.
  // Always includes tenantId in WHERE — tenant A cannot read tenant B's events.
  // Returns null (not an error) when not found — caller decides to 404 or not.
  async findById(id: string, tenantId: string): Promise<AuditEvent | null> {
    return prisma.auditEvent.findFirst({
      where: { id, tenantId },
    });
  }

  // SELECT many events with filters + cursor-based pagination.
  //
  // WHY cursor, not offset (page=2&limit=10)?
  // Offset pagination scans the table from the start every time.
  // With millions of rows, page 5000 would be very slow.
  // Cursor pagination jumps directly to the last seen item ID — stays fast always.
  //
  // HOW cursor pagination works here:
  //   1. Client requests first page: { limit: 20 } — no cursor
  //   2. Server fetches limit+1 rows (21) to detect whether a next page exists
  //   3. Server returns 20 rows + nextCursor = last row's ID + hasMore: true
  //   4. Client requests next page: { limit: 20, cursor: '<id of row 20>' }
  //   5. Prisma sets cursor: { id: ... } + skip: 1 → starts AFTER that row
  //   6. Repeat until hasMore: false
  //
  // NOTE: We fetch limit+1 in the SERVICE layer (not here) so the repository
  // stays simple and testable. The service slices the result and sets hasMore.
  async findMany(input: FindEventsInput): Promise<AuditEvent[]> {
    // Default limit: 50. The service passes limit+1 to detect hasMore.
    const limit = input.limit ?? 50;

    // Sort direction defaults to 'desc' (newest first).
    // The Query API exposes this as a 'sort' query param.
    const sortDirection = input.sort ?? 'desc';

    return prisma.auditEvent.findMany({
      where: {
        // tenantId MUST always be first — it's the most selective filter
        // and PostgreSQL will use the composite index starting with tenantId
        tenantId: input.tenantId,

        // Spread short-circuit pattern:
        // If input.actor is undefined/null/'', this spreads nothing.
        // If input.actor has a value, this spreads { actor: 'admin@...' } into where.
        // Prisma ignores undefined — so we get a clean, dynamic WHERE clause.
        ...(input.actor         && { actor: { contains: input.actor, mode: 'insensitive' } }),
        ...(input.action        && { action: { contains: input.action, mode: 'insensitive' } }),
        ...(input.resourceType  && { resourceType: { contains: input.resourceType, mode: 'insensitive' } }),
        ...(input.resourceId    && { resourceId: { contains: input.resourceId, mode: 'insensitive' } }),
        ...(input.sourceService && { sourceService: { contains: input.sourceService, mode: 'insensitive' } }),

        // Date range filter — gte (>=) and lte (<=) on createdAt
        // Only spread if at least one date boundary is provided
        ...(input.fromDate || input.toDate
          ? {
              createdAt: {
                ...(input.fromDate && { gte: input.fromDate }),
                ...(input.toDate   && { lte: input.toDate }),
              },
            }
          : {}),
      },

      // Phase 7: sort direction is now dynamic (was hardcoded 'desc' before)
      // This uses the (tenantId, createdAt DESC) composite index for 'desc'
      // For 'asc', PostgreSQL reads the same index in reverse — still efficient
      orderBy: { createdAt: sortDirection },

      // Fetch N rows (limit+1 is passed by the service to detect hasMore)
      take: limit,

      // Cursor pagination — only applied when a cursor is provided
      // skip: 1 skips the cursor row itself (we already showed it on the previous page)
      // cursor: { id: ... } tells Prisma where to start reading from the index
      ...(input.cursor && {
        skip:   1,
        cursor: { id: input.cursor },
      }),
    });
  }

  // COUNT events matching filters — used to return pagination metadata.
  async count(input: Omit<FindEventsInput, 'limit' | 'cursor'>): Promise<number> {
    return prisma.auditEvent.count({
      where: {
        tenantId: input.tenantId,
        ...(input.actor         && { actor: { contains: input.actor, mode: 'insensitive' } }),
        ...(input.action        && { action: { contains: input.action, mode: 'insensitive' } }),
        ...(input.resourceType  && { resourceType: { contains: input.resourceType, mode: 'insensitive' } }),
        ...(input.resourceId    && { resourceId: { contains: input.resourceId, mode: 'insensitive' } }),
        ...(input.sourceService && { sourceService: { contains: input.sourceService, mode: 'insensitive' } }),
        ...(input.fromDate || input.toDate
          ? {
              createdAt: {
                ...(input.fromDate && { gte: input.fromDate }),
                ...(input.toDate   && { lte: input.toDate }),
              },
            }
          : {}),
      },
    });
  }
  // FIND RECENT — the last N events for a tenant, ordered newest first.
  // Called by the GET /events/recent controller on a cache miss.
  // Default limit 25 matches typical dashboard widget size.
  async findRecent(tenantId: string, limit = 25): Promise<AuditEvent[]> {
    return prisma.auditEvent.findMany({
      where:   { tenantId },
      orderBy: { createdAt: 'desc' },
      take:    limit,
    });
  }

  // GET STATS — aggregated dashboard statistics for a tenant.
  // This runs multiple COUNT/GROUP BY queries — expensive on large tables.
  // That's exactly why we cache the result in Redis (CacheService.setStats).
  async getStats(tenantId: string): Promise<{
    totalEvents:       number;
    eventsToday:       number;
    topActors:         Array<{ actor: string; count: number }>;
    topActions:        Array<{ action: string; count: number }>;
    failedLoginsToday: number;
  }> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalEvents, eventsToday, topActorsRaw, topActionsRaw, failedLoginsToday] =
      await Promise.all([
        prisma.auditEvent.count({ where: { tenantId } }),

        prisma.auditEvent.count({
          where: { tenantId, createdAt: { gte: todayStart } },
        }),

        prisma.auditEvent.groupBy({
          by: ['actor'],
          where: { tenantId },
          _count: { actor: true },
          orderBy: { _count: { actor: 'desc' } },
          take: 5,
        }),

        prisma.auditEvent.groupBy({
          by: ['action'],
          where: { tenantId },
          _count: { action: true },
          orderBy: { _count: { action: 'desc' } },
          take: 5,
        }),

        prisma.auditEvent.count({
          where: {
            tenantId,
            action:    'LOGIN_FAILED',
            createdAt: { gte: todayStart },
          },
        }),
      ]);

    return {
      totalEvents,
      eventsToday,
      topActors:  topActorsRaw.map(r => ({ actor: r.actor, count: r._count.actor })),
      topActions: topActionsRaw.map(r => ({ action: r.action, count: r._count.action })),
      failedLoginsToday,
    };
  }

  // GET TRENDS — Events per hour for the last 24 hours
  async getTrends(tenantId: string) {
    const since = new Date();
    since.setHours(since.getHours() - 24, 0, 0, 0);

    const events = await prisma.auditEvent.findMany({
      where: {
        tenantId,
        createdAt: { gte: since },
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const map: Record<string, number> = {};
    for (const e of events) {
      // Group by date+hour string: 'YYYY-MM-DDTHH:00:00.000Z'
      const hour = new Date(e.createdAt);
      hour.setMinutes(0, 0, 0);
      const hourStr = hour.toISOString();
      map[hourStr] = (map[hourStr] || 0) + 1;
    }

    return Object.entries(map).map(([hour, count]) => ({ hour, count }));
  }

  // GET RELATED EVENTS — events by same actor within ±30 minutes
  async findRelatedEvents(tenantId: string, eventId: string) {
    const event = await this.findById(eventId, tenantId);
    if (!event) return null;

    const windowStart = new Date(event.createdAt.getTime() - 30 * 60000);
    const windowEnd = new Date(event.createdAt.getTime() + 30 * 60000);

    return prisma.auditEvent.findMany({
      where: {
        tenantId,
        actor: event.actor,
        id: { not: event.id },
        createdAt: { gte: windowStart, lte: windowEnd },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}

export const eventRepository = new EventRepository();
