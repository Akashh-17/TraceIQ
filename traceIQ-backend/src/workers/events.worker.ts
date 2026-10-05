// src/workers/events.worker.ts
//
// Events Worker (The Background Chef)
// =====================================
// Why this file exists:
// The API's job ends the moment it drops the event into the Queue.
// Someone still needs to pick up those jobs and write them to PostgreSQL.
// That someone is this Worker.
//
// Architecture role:
// This is the CONSUMER side of the producer-consumer pattern.
// The Worker runs as a completely separate process from the API server.
// It listens to the 'audit-events' queue 24/7 and processes one job at a time.
//
// Why keep it separate from the API?
// If the API crashes, the Worker keeps running and draining the queue.
// If the Worker crashes, the API keeps accepting jobs into the queue.
// They are decoupled — neither process depends on the other being alive.
//
// Retry Behaviour:
// If this processor throws an error, BullMQ catches it and retries
// the job based on the configuration set in queue.ts (3 attempts, exponential backoff).
// The job is NEVER lost — it sits in Redis until it succeeds.

import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/queue';
import { redisClient } from '../config/redis';
import { eventRepository } from '../models/event.repository';
import { cacheService } from '../services/cache.service';
import { Prisma } from '@prisma/client';
import { workerLogger } from '../config/logger';
import { embeddingService } from '../modules/ai/embedding.service';
import { DetectionEngine } from '../modules/detection/detection.engine';

// The detection rules need a real ioredis client (zadd, get, setex...).
// redisConnection is only BullMQ's connection *options*, not a client.
const detectionEngine = new DetectionEngine(redisClient);

// The shape of data we expect inside every job.
// Must match exactly what EventsService pushes into the queue.
interface AuditEventJobData {
  tenantId:      string;
  actor:         string;
  action:        string;
  resourceType:  string;
  resourceId:    string;
  sourceService: string;
  metadata?:     Record<string, unknown>;
}

// The processor function — called by BullMQ for every job it dequeues.
// If this throws, BullMQ marks the job as failed and schedules a retry.
// If this returns, BullMQ marks the job as completed.
async function processAuditEvent(job: Job<AuditEventJobData>): Promise<void> {
  const { tenantId, actor, action, resourceType, resourceId, sourceService, metadata } = job.data;

  workerLogger.info(
    { jobId: job.id, action, actor, tenantId },
    'Processing job'
  );

  // Operational RAG: Generate Natural Language and Embedding
  const nlRepresentation = embeddingService.generateNaturalLanguageRepresentation({
    actor, action, resourceType, resourceId, sourceService, metadata
  });
  const embedding = await embeddingService.generateEmbedding(nlRepresentation);

  const savedEvent = await eventRepository.create({
    tenantId,
    actor,
    action,
    resourceType,
    resourceId,
    sourceService,
    metadata: metadata as Prisma.InputJsonValue | undefined,
    nlRepresentation,
    embedding
  });

  // Run the Deterministic Detection Engine
  await detectionEngine.runDetections({
    ...job.data,
    id: savedEvent.id
  });

  // Cache Invalidation — critical step.
  // Now that a new event is in PostgreSQL, the cached "recent events" and
  // "stats" for this tenant are stale. Delete them so the next dashboard
  // read triggers a cache miss and fetches fresh data from PostgreSQL.
  await cacheService.invalidateTenant(tenantId);

  workerLogger.info(
    { jobId: job.id, action },
    'Job completed: saved to DB and cache invalidated'
  );
}

// Create the Worker — registers our processor function with BullMQ.
// BullMQ will continuously poll Redis for new 'audit-events' jobs
// and call processAuditEvent for each one.
export const eventsWorker = new Worker<AuditEventJobData>(
  'audit-events',
  processAuditEvent,
  {
    connection: redisConnection,
    concurrency: 5, // Process up to 5 jobs simultaneously
  }
);

// Lifecycle event listeners — useful for monitoring and debugging
eventsWorker.on('completed', (job: Job) => {
  workerLogger.info({ jobId: job.id }, 'Job completed successfully');
});

eventsWorker.on('failed', (job: Job | undefined, err: Error) => {
  workerLogger.error(
    { jobId: job?.id, err: err.message, stack: err.stack },
    'Job failed'
  );
});

eventsWorker.on('error', (err: Error) => {
  workerLogger.error({ err: err.message, stack: err.stack }, 'Worker error');
});
