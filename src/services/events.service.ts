// src/services/events.service.ts
//
// SERVICE — the business logic layer (Producer in Phase 5)
// =========================================================
// Why this file exists:
// The Controller validates the HTTP request and extracts the tenantId.
// The Repository knows how to write to PostgreSQL.
// The Service is the bridge — it decides WHAT to do with the data.
//
// Phase 5 Architecture Change:
// BEFORE (Phase 3):  Service → Repository → PostgreSQL  (synchronous, blocking)
// AFTER  (Phase 5):  Service → BullMQ Queue → 202 immediately
//                    (Worker picks it up in background → Repository → PostgreSQL)
//
// Why doesn't the Service call the Repository directly anymore?
// Because we are now asynchronous. The API must return 202 immediately.
// The actual DB write is the Worker's responsibility, not the Service's.
//
// The Service is now the PRODUCER.
// Its only job is: accept the data, drop it into the queue, return.

import { CreateEventDto } from '../types/event.types';
import { auditEventsQueue } from '../config/queue';

export class EventsService {

  // tenantId is passed by the Controller — the Service never reads HTTP headers or env vars.
  // This keeps the Service reusable from any context (HTTP, CLI, cron jobs, etc.)
  async createEvent(
    dto: CreateEventDto,
    tenantId: string
  ): Promise<{ queued: boolean }> {

    // Push the job into the BullMQ queue.
    // This writes to Redis (~1ms) and returns immediately.
    // The Controller will respond with 202 Accepted.
    // The Worker will read this job from Redis and write to PostgreSQL in the background.
    await auditEventsQueue.add('ingest-event', {
      tenantId,
      actor:         dto.actor,
      action:        dto.action,
      resourceType:  dto.resource_type,
      resourceId:    dto.resource_id,
      sourceService: dto.source_service,
      metadata:      dto.metadata,
    });

    return { queued: true };
  }
}

export const eventsService = new EventsService();