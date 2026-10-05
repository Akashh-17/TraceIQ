// src/config/redis.ts
//
// Redis Client Singleton (Cache Layer)
// =====================================
// Why this file exists:
// BullMQ has its own internal Redis connection (managed by the Queue/Worker).
// But for our CACHE layer, we need a separate, explicit Redis client.
// This file creates that client — a single shared instance used by CacheService.
//
// Why a singleton?
// Same reason as Prisma: opening a new Redis connection per request is expensive.
// One connection, reused everywhere.
//
// Why ioredis?
// ioredis is the most production-battle-tested Redis client for Node.js.
// BullMQ also uses ioredis internally. We use it directly for full control
// over cache reads/writes without going through BullMQ's abstraction.
//
// This Redis client is ONLY for caching.
// BullMQ's Redis (queue jobs) is managed by BullMQ internally via queue.ts.

import Redis from 'ioredis';
import { env } from './env';
import { cacheLogger } from './logger';

function createRedisClient(): Redis {
  const client = new Redis(env.redisUrl, {
    // Automatically reconnect with exponential backoff if Redis goes down.
    // This makes our cache resilient — temporary Redis outages don't crash the app.
    maxRetriesPerRequest: null, // Required for BullMQ compatibility (do not change)
    enableReadyCheck: false,
    lazyConnect: false,
  });

  client.on('connect', () => {
    cacheLogger.info('Cache client connected');
  });

  client.on('error', (err: Error) => {
    // Log at WARN level, not ERROR.
    // Why? An error implies a failed operation that needs fixing.
    // Here, Redis going down is an operational reality we handle gracefully.
    // The application continues to work (Cache-Aside fallback).
    cacheLogger.warn({ err: err.message }, 'Cache client connection issue');
  });

  return client;
}

// Singleton — one shared Redis client for all cache operations
export const redisClient = createRedisClient();
