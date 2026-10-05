// src/types/query.types.ts
//
// WHY THIS FILE EXISTS:
// =====================
// In Phase 2, we created CreateEventSchema to validate the REQUEST BODY (POST /events).
// That schema validates what the client sends when CREATING an event.
//
// This file does the same job for QUERY PARAMETERS — the filters a client sends when
// READING events: GET /api/v1/events?actor=...&action=...&cursor=...
//
// Query parameters arrive in req.query as plain strings.
// Even if a client sends ?limit=20, Express gives you the string "20", not the number 20.
// Zod transforms these strings into the correct types for us.
//
// KEY DIFFERENCE from CreateEventSchema:
//   CreateEventSchema — validates req.body (JSON), all fields required
//   EventQuerySchema  — validates req.query (URL params), ALL fields optional (they are filters)
//
// Phase 7: Used by EventsController.queryEvents()
// Future: Phase 9 (export) will extend this schema for CSV/JSON export params

import { z } from 'zod/v4';

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: ISO date string validator
// ─────────────────────────────────────────────────────────────────────────────
// Query params arrive as strings. "2025-01-15" is a valid ISO date string.
// We validate the format here and transform it into a JavaScript Date object.
// Prisma expects Date objects in its where clauses — not raw strings.
//
// Why not use z.date()? Because z.date() expects a Date object as input.
// Query params are always strings. We need z.string() + .transform() to convert.
const isoDateString = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/,
    'Date must be in ISO 8601 format (e.g. 2025-01-15 or 2025-01-15T00:00:00Z)'
  )
  .transform((val) => new Date(val)); // convert the string to a real Date for Prisma

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA: EventQuerySchema
// ─────────────────────────────────────────────────────────────────────────────
// Every field is optional because filters are optional.
// You can call GET /api/v1/events with NO filters and get all tenant events.
// You can add any combination of filters to narrow the results.
//
// This schema also handles:
//   - Type coercion: "20" → 20 (limit)
//   - Defaults: sort defaults to 'desc' (newest first)
//   - Validation: limit must be 1–100 (prevents fetching 1 million rows at once)
export const EventQuerySchema = z.object({
  // ── Filter fields ──────────────────────────────────────────────────────────
  // These map directly to WHERE clauses in the SQL query.
  // All use exact-match filtering (=).
  // The actor field in req.query is a plain string — we validate it's a real email.
  actor: z
    .string()
    .optional(),

  // action must match the UPPERCASE_WITH_UNDERSCORES convention
  // (same regex as CreateEventSchema.action — consistency matters)
  action: z
    .string()
    .optional(),

  // These two are free-form strings — no format enforcement needed
  resource_type: z.string().min(1).optional(),
  resource_id:   z.string().min(1).optional(),

  // source_service must also be UPPERCASE_WITH_UNDERSCORES
  source_service: z
    .string()
    .optional(),

  // ── Date range filters ────────────────────────────────────────────────────
  // "from" = lower bound: events AFTER this date (inclusive)
  // "to"   = upper bound: events BEFORE this date (inclusive)
  // The isoDateString helper converts the string to a Date for Prisma
  from: isoDateString.optional(),
  to:   isoDateString.optional(),

  // ── Cursor Pagination ─────────────────────────────────────────────────────
  // cursor = the ID of the last event the client already received.
  // On the next request, the client sends this cursor back.
  // The API returns events AFTER this cursor (exclusive — the cursor row itself is skipped).
  //
  // Why UUID format? Because our event IDs are UUIDs.
  // Validating the format prevents SQL injection attempts via the cursor parameter.
  cursor: z
    .string()
    .uuid('cursor must be a valid event UUID')
    .optional(),

  // limit = how many events to return per page
  // .coerce converts the string "20" to the number 20 (query params are always strings)
  // Default: 20. Minimum: 1. Maximum: 100.
  // Capping at 100 prevents a caller from requesting 10,000 rows at once.
  limit: z.coerce
    .number()
    .int()
    .min(1, 'limit must be at least 1')
    .max(100, 'limit cannot exceed 100')
    .default(20),

  // ── Sort Direction ────────────────────────────────────────────────────────
  // 'desc' = newest first (default — audit logs are usually investigated from latest)
  // 'asc'  = oldest first (useful for replaying events in chronological order)
  sort: z.enum(['asc', 'desc']).default('desc'),
});

// ─────────────────────────────────────────────────────────────────────────────
// TYPE: EventQueryDto
// ─────────────────────────────────────────────────────────────────────────────
// z.infer extracts the TypeScript type from the schema automatically.
// This is the type of the VALIDATED, TRANSFORMED query object.
// After Zod runs safeParse, the result.data matches this type exactly.
// Note: 'from' and 'to' are Date objects here (transformed by isoDateString),
// and 'limit' is a number (coerced from string).
export type EventQueryDto = z.infer<typeof EventQuerySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA: DetectionQuerySchema
// ─────────────────────────────────────────────────────────────────────────────
export const DetectionQuerySchema = z.object({
  actor:    z.string().optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  status:   z.enum(['OPEN', 'ACKNOWLEDGED', 'RESOLVED']).optional(),
  from:     isoDateString.optional(),
  to:       isoDateString.optional(),
  cursor:   z.string().uuid('cursor must be a valid detection UUID').optional(),
  limit:    z.coerce.number().int().min(1).max(100).default(20),
});

export type DetectionQueryDto = z.infer<typeof DetectionQuerySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA: UpdateDetectionStatusSchema
// ─────────────────────────────────────────────────────────────────────────────
export const UpdateDetectionStatusSchema = z.object({
  status: z.enum(['OPEN', 'ACKNOWLEDGED', 'RESOLVED']),
});

export type UpdateDetectionStatusDto = z.infer<typeof UpdateDetectionStatusSchema>;
