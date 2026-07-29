// prisma.config.ts  (PROJECT ROOT — not inside src/)
//
// Prisma v7 Configuration File
// ==============================
// In Prisma v7, the database connection URL moved OUT of schema.prisma
// and INTO this file. This is where Prisma CLI (migrate, generate, studio)
// reads the connection string from.
//
// The `prisma/config` module is provided by the Prisma CLI itself.

/// <reference types="node" />

import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  // Path to your schema file (relative to this config file)
  schema: 'prisma/schema.prisma',

  // Database connection configuration
  // env() reads from process.env, which dotenv has already loaded above
  datasource: {
    url: process.env['DATABASE_URL'] as string,
  },

  // Where migration files are stored
  migrations: {
    path: 'prisma/migrations',
  },
});
