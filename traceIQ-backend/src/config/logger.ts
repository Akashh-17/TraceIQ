// src/config/logger.ts
//
// WHY THIS FILE EXISTS:
// =====================
// This is the SINGLE source of truth for logging in TraceIQ.
// Every file that needs to log something imports `logger` from here.
// Never use console.log/console.error directly in application code.
//
// WHY PINO INSTEAD OF console.log?
// ---------------------------------
// console.log produces plain text strings:
//   [Worker] Processing job #42: LOGIN_FAILED by admin@company.com
// Pino produces structured JSON:
//   {"level":"info","time":1705123456,"msg":"Processing job","jobId":"42","action":"LOGIN_FAILED"}
//
// Production systems (AWS CloudWatch, Datadog, Grafana Loki) ingest JSON.
// They allow you to query: "show all ERROR logs for tenantId=abc in the last hour"
// Plain text cannot be queried this way.
//
// WHY PINO IS FAST:
// -----------------
// Pino defers formatting. When you call logger.info(...), Pino writes to an
// internal buffer with almost zero overhead. A separate stream processes
// and formats the buffer asynchronously.
// Result: Pino is ~5-10x faster than Winston on high-throughput APIs.
//
// DEVELOPMENT vs PRODUCTION:
// --------------------------
// Development:  pino-pretty converts JSON → human-readable coloured output
//               so developers can read logs without squinting at raw JSON
// Production:   raw JSON output — shipped directly to log aggregation system
//
// Phase 7.5: Created. Used by all files that previously used console.log/console.error.
// Future phases: correlation ID middleware will attach request IDs to child loggers.

import pino from 'pino';
import { isDev } from './env';

// ─────────────────────────────────────────────────────────────────────────────
// LOG LEVELS (ordered by severity, lowest to highest):
// ─────────────────────────────────────────────────────────────────────────────
// trace  — ultra-verbose (rarely used in application code)
// debug  — development detail (Redis key lookups, Prisma query params)
// info   — normal business events (job processed, server started, request handled)
// warn   — unexpected but recoverable (Redis down → falling back to PostgreSQL)
// error  — something failed (job failed, DB unreachable, uncaught exception)
// fatal  — application cannot continue (missing env var, port in use)
//
// Setting level:'info' in production means debug + trace entries are silently
// discarded — they never make it to the output stream. Zero performance cost.

export const logger = pino(
  {
    // Minimum level to log. Anything below this level is discarded.
    // In development we want all debug output.
    // In production we only care about info and above (warn, error, fatal).
    level: isDev ? 'debug' : 'info',

    // Pino's default timestamp is epoch milliseconds (a number).
    // ISO 8601 strings are more readable and compatible with log systems.
    timestamp: pino.stdTimeFunctions.isoTime,

    // base: null removes the 'pid' and 'hostname' fields from every log entry.
    // In containerised environments, hostname is the container ID — not useful.
    // PID is always 1 in Docker. Both fields add noise without value.
    base: null,

    // In production, add a 'service' field to every log entry.
    // When logs from multiple services flow into one aggregation system,
    // this field tells you which service produced each entry.
    ...(isDev
      ? {}
      : {
          base: {
            service: 'audit-log-service',
            env: 'production',
          },
        }),
  },

  // TRANSPORT: where logs go and how they are formatted
  //
  // Development:
  //   pino-pretty transforms JSON → human-readable coloured output
  //   Example output:
  //     [10:23:45.123] INFO: Server started on port 3000
  //         env: "development"
  //
  // Production:
  //   pino.destination(1) = stdout (file descriptor 1)
  //   Raw JSON goes directly to stdout, which the container runtime captures
  //   and routes to CloudWatch / Datadog / Loki etc.
  isDev
    ? pino.transport({
        target: 'pino-pretty',
        options: {
          colorize:        true,       // colours for different log levels
          translateTime:   'HH:MM:ss.l', // show time as 10:23:45.123 not epoch
          ignore:          'pid,hostname', // hide the useless fields
          singleLine:      false,      // multi-line output for readability
        },
      })
    : pino.destination(1) // stdout — raw JSON in production
);

// ─────────────────────────────────────────────────────────────────────────────
// CHILD LOGGERS
// ─────────────────────────────────────────────────────────────────────────────
// A child logger inherits all parent settings but adds permanent context fields.
// Every log entry from a child logger automatically includes those fields.
//
// Usage pattern — each module creates its own child:
//   const log = logger.child({ module: 'EventsController' });
//   log.info('queryEvents called');
//   // → {"level":"info","module":"EventsController","msg":"queryEvents called"}
//
// This lets you filter logs by module in production:
//   WHERE module = 'EventsWorker' AND level = 'error'
//
// Pre-built child loggers for TraceIQ's core modules:
export const workerLogger     = logger.child({ module: 'EventsWorker' });
export const cacheLogger      = logger.child({ module: 'CacheService' });
export const healthLogger     = logger.child({ module: 'HealthCheck' });
export const controllerLogger = logger.child({ module: 'Controller' });
