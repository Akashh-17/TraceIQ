// src/config/prisma.ts
//
// Singleton Prisma Client  (Prisma v7 + pg driver adapter)
// =========================================================
// Why a singleton?
// PrismaClient opens a connection pool to PostgreSQL.
// If you call `new PrismaClient()` in multiple files, you create multiple pools.
// In development with hot-reload (nodemon), each file save could create a NEW pool
// and eventually exhaust PostgreSQL's connection limit.
//
// Solution: create ONE instance for the entire app lifetime.
//
// Prisma v7 change:
// Prisma v7 requires an explicit driver adapter for the database connection.
// We use `@prisma/adapter-pg` which wraps the `pg` (node-postgres) library.
// This gives Prisma direct control over connection pooling.
//
// In development:  store the instance on `global` so nodemon hot-reloads
//                  reuse the same client instead of creating a new one.
// In production:   just create the instance once (no hot-reload).

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { isDev } from './env';

// Extend the Node.js global type to include our prisma instance.
// This is TypeScript-only — has zero runtime overhead.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create the driver adapter — it manages the actual PostgreSQL connection pool.
// DATABASE_URL is guaranteed to exist because env.ts already validated it
// (if it were missing, the app would have crashed at startup already).
function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: process.env['DATABASE_URL'] as string,
  });

  return new PrismaClient({
    adapter,
    // Log configuration:
    // - Development: log queries so you can see what SQL Prisma generates
    // - Production:  only log errors (verbose query logs waste I/O)
    log: isDev
      ? ['query', 'error', 'warn']
      : ['error'],
  });
}

// Use the global instance in dev (survives hot-reload), create fresh in prod
export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

// In development, persist the client on globalThis so nodemon doesn't
// create a new pool on every file save.
if (isDev) {
  globalForPrisma.prisma = prisma;
}
