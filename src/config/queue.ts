// src/config/queue.ts
//
// Queue Configuration (The Queue Control Room)
// =============================================
// Why this file exists:
// BullMQ needs two things: a Redis connection and a Queue instance.
// Just like prisma.ts gives the entire app one shared database connection,
// this file gives the entire app one shared Redis connection and one shared Queue.
//
// Why Redis?
// BullMQ stores all jobs in Redis (an in-memory store). Redis is fast enough
// to accept 1000+ job writes per second without breaking a sweat.
// Jobs live in Redis until a Worker picks them up and processes them.
//
// Why one Queue instance?
// Multiple Queue instances pointing at the same Redis key = duplicate job tracking.
// One shared instance = clean, consistent job management.

import { Queue } from 'bullmq';
import { env } from './env';

// Connection config reused by both the Queue (producer) and Worker (consumer).
// Extracted separately so we never have to repeat the Redis URL in multiple files.
export const redisConnection = {
  url: env.redisUrl,
};

// The audit-events queue — the central inbox for all events arriving at the API.
// Producer: EventsService pushes jobs here.
// Consumer: The events.worker.ts picks jobs from here.
//
// 'audit-events' is just a name. BullMQ uses this as a namespace in Redis.
// All related keys in Redis will be prefixed: bull:audit-events:*
export const auditEventsQueue = new Queue('audit-events', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,          // Retry up to 3 times if the job fails
    backoff: {
      type: 'exponential', // Wait 2s, 4s, 8s between retries (not hammer-every-second)
      delay: 2000,
    },
    removeOnComplete: 100, // Keep the last 100 completed jobs for inspection
    removeOnFail: 500,     // Keep the last 500 failed jobs for debugging
  },
});
