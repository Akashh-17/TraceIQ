// src/workers/index.ts
//
// Worker Process Entry Point
// ===========================
// Why this file exists:
// The Worker is a SEPARATE PROCESS from the API server.
//
//   npm run dev    → starts src/server.ts (the API)
//   npm run worker → starts src/workers/index.ts (the background processor)
//
// Both run simultaneously and independently. They communicate only through Redis.
// If one crashes, the other continues working.
//
// This file simply boots the worker and ensures it shuts down cleanly.

import 'dotenv/config';
import { eventsWorker } from './events.worker';
import { workerLogger } from '../config/logger';

workerLogger.info('🚀 Starting audit events worker...');
workerLogger.info('Listening for jobs on queue: audit-events');

// Graceful shutdown — when the process receives a termination signal (e.g. Ctrl+C or Docker stop),
// we close the worker cleanly so in-flight jobs can finish before the process exits.
async function shutdown(): Promise<void> {
  workerLogger.info('🛑 Shutting down gracefully...');
  await eventsWorker.close();
  workerLogger.info('Worker closed, exiting process.');
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
