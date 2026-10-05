// src/routes/health.ts
//
// ENHANCED HEALTH ENDPOINT
// =========================
// This is not a simple "Hello World" endpoint anymore.
// Cloud platforms (AWS ECS, Kubernetes) call this every ~10 seconds.
//
// We check three critical dependencies:
//   1. PostgreSQL (Prisma)
//   2. Redis (Cache)
//   3. BullMQ (Queue)
//
// CRITICAL RULE: This endpoint MUST NEVER CRASH.
// Even if the database is on fire, this must return a JSON response.
// If it throws an uncaught error, the load balancer assumes the whole container
// is dead and restarts it — hiding the actual dependency issue.

import { Router, Request, Response } from "express";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { redisClient } from "../config/redis";
import { auditEventsQueue } from "../config/queue";
import { healthLogger } from "../config/logger";

const router = Router();

router.get("/health", async (_req: Request, res: Response): Promise<void> => {
  const healthStatus: any = {
    status: "ok", // 'ok' | 'degraded' | 'error'
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: env.nodeEnv,
    dependencies: {
      database: "unknown",
      redis: "unknown",
      queue: "unknown",
    }
  };

  let hasError = false;
  let hasDegraded = false;

  // ── 1. Check PostgreSQL ──────────────────────────────────────────────────────
  try {
    // SELECT 1 is the universal "are you there?" database ping.
    // It is extremely fast and doesn't touch any actual tables.
    await prisma.$queryRaw`SELECT 1`;
    healthStatus.dependencies.database = "ok";
  } catch (err) {
    healthLogger.error({ err }, 'Database health check failed');
    healthStatus.dependencies.database = "error";
    hasError = true; // DB is critical, so we flag an error
  }

  // ── 2. Check Redis (Cache) ───────────────────────────────────────────────────
  try {
    const pingResult = await redisClient.ping();
    if (pingResult === "PONG") {
      healthStatus.dependencies.redis = "ok";
    } else {
      throw new Error("Redis did not return PONG");
    }
  } catch (err) {
    healthLogger.warn({ err }, 'Redis health check failed');
    healthStatus.dependencies.redis = "error";
    // Redis is a cache (graceful degradation), so it's a 'degraded' state, not fatal.
    hasDegraded = true;
  }

  // ── 3. Check BullMQ (Queue) ──────────────────────────────────────────────────
  try {
    // We check if the queue is reachable by fetching job counts.
    // This confirms BullMQ can communicate with Redis.
    await auditEventsQueue.getJobCounts();
    healthStatus.dependencies.queue = "ok";
  } catch (err) {
    healthLogger.error({ err }, 'BullMQ health check failed');
    healthStatus.dependencies.queue = "error";
    hasError = true; // If queue is down, we can't ingest events — critical failure.
  }

  // ── Determine Overall Status ─────────────────────────────────────────────────
  // If a critical dependency (DB, Queue) is down, overall status is 'error'.
  // If only a non-critical one (Cache) is down, overall status is 'degraded'.
  if (hasError) {
    healthStatus.status = "error";
  } else if (hasDegraded) {
    healthStatus.status = "degraded";
  }

  // HTTP Status Code Mapping:
  // 200 OK -> Fully healthy OR degraded (graceful fallback active).
  //           Load balancers should keep sending traffic.
  // 503 Service Unavailable -> Critical failure. Load balancers should stop traffic.
  const httpStatus = healthStatus.status === "error" ? 503 : 200;

  res.status(httpStatus).json(healthStatus);
});

export default router;