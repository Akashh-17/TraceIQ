// prisma/seed.ts
//
// Database Seed Script — Development / Demo
// ==========================================
// Creates:
//   - 2 tenants (FinStack, MedVault) with API keys
//   - 5 RBAC users for FinStack
//   - ~150 realistic audit events for FinStack, spread over 30 days
//   - 3 detections, one per rule, each linked to the seeded events that match it:
//       * bob.smith@finstack.com: 6 failed logins in 8 minutes  → MULTIPLE_FAILED_LOGINS (OPEN)
//       * alice.johnson@finstack.com: exports 1 500 records      → BULK_DATA_EXPORT (OPEN)
//       * admin@finstack.com: permission change at 22:40         → AFTER_HOURS_ADMIN_ACTIVITY (RESOLVED)
//
// Why detections are inserted directly instead of running the detection engine:
//   the rules evaluate against the current clock (Date.now / getHours), so replaying
//   historical events would stamp every detection "now" and make the after-hours rule
//   depend on when the seed runs.
//
// Embeddings:
//   If GOOGLE_API_KEY is set, all NL representations are embedded with Gemini in
//   batched calls. Otherwise events are seeded without embeddings — everything
//   still works; semantic search just returns nothing.
//
// Run with:
//   npm run db:seed          → skips events/detections if FinStack already has events
//   npm run db:seed:reset    → wipes FinStack's events, detections, investigations and
//                              Redis keys, then reseeds (use before every demo)

import 'dotenv/config';
import { PrismaClient, Role, DetectionSeverity, DetectionStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import Redis from 'ioredis';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const RESET = process.argv.includes('--reset');

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// ── Tenant / User seed config ────────────────────────────────────────────────

const TENANTS = [
  { name: 'FinStack',  rawApiKey: 'tk_live_finstack_999' },
  { name: 'MedVault',  rawApiKey: 'tk_live_medvault_888' },
];

// ── Event actors & services ───────────────────────────────────────────────────

const ACTORS = [
  'admin@finstack.com',
  'analyst@finstack.com',
  'auditor@finstack.com',
  'alice.johnson@finstack.com',
  'bob.smith@finstack.com',
  'charlie.zhang@finstack.com',
  'system@finstack.com',
];

const SERVICES = ['auth-service', 'transaction-service', 'reporting-service', 'user-management-service'];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns a Date N days ago, at the given hour:minute */
function daysAgo(days: number, hour = 10, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  // A "today" event scheduled later than now (e.g. seeding at 10 AM) would sit in the future.
  if (d > new Date()) d.setDate(d.getDate() - 1);
  return d;
}

/** Clamp hour to business hours 8–18 for realistic spread */
function bizHour(seed: number): number {
  return 8 + (seed % 11); // 8 to 18
}

function nlOf(actor: string, action: string, resourceType: string, resourceId: string, service: string, meta?: object): string {
  const metaStr = meta ? ` with details: ${JSON.stringify(meta)}` : '';
  return `User ${actor} performed ${action} on ${resourceType} (${resourceId}) via ${service}${metaStr}.`;
}

// ── Event definitions ─────────────────────────────────────────────────────────
//
// Each entry is everything except the DB id and timestamps.
// Timestamps are assigned below after the definitions array so we can
// reason about distribution separately.

interface EventTemplate {
  actor: string;
  action: string;
  resourceType: string;
  resourceId: string;
  sourceService: string;
  metadata?: Record<string, any>;
  daysBack: number;   // how many days ago
  hour: number;       // hour of day (0–23)
  minute: number;
}

const EVENTS: EventTemplate[] = [
  // ── Days 28–22 ago: sparse baseline activity ─────────────────────────────

  { actor: 'admin@finstack.com',          action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_001', sourceService: 'auth-service',            metadata: { ip: '10.0.0.1', browser: 'Chrome' }, daysBack: 28, hour: 9,  minute: 12 },
  { actor: 'alice.johnson@finstack.com',  action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_002', sourceService: 'auth-service',            metadata: { ip: '10.0.0.5', browser: 'Firefox' }, daysBack: 28, hour: 9, minute: 31 },
  { actor: 'alice.johnson@finstack.com',  action: 'RECORD_READ',          resourceType: 'transaction', resourceId: 'txn_2801', sourceService: 'transaction-service',     metadata: { amount: 12000 }, daysBack: 28, hour: 10, minute: 5 },
  { actor: 'alice.johnson@finstack.com',  action: 'RECORD_READ',          resourceType: 'transaction', resourceId: 'txn_2802', sourceService: 'transaction-service',     metadata: { amount: 8500 },  daysBack: 28, hour: 10, minute: 22 },
  { actor: 'charlie.zhang@finstack.com',  action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_003', sourceService: 'auth-service',            metadata: { ip: '10.0.0.8' }, daysBack: 27, hour: 8, minute: 45 },
  { actor: 'charlie.zhang@finstack.com',  action: 'TRANSACTION_APPROVED', resourceType: 'transaction', resourceId: 'txn_2710', sourceService: 'transaction-service',     metadata: { amount: 25000, currency: 'INR' }, daysBack: 27, hour: 9, minute: 10 },
  { actor: 'analyst@finstack.com',        action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_004', sourceService: 'auth-service',            metadata: { ip: '10.0.0.3' }, daysBack: 26, hour: 10, minute: 0 },
  { actor: 'analyst@finstack.com',        action: 'REPORT_GENERATED',     resourceType: 'report',      resourceId: 'rpt_2601', sourceService: 'reporting-service',       metadata: { type: 'monthly_summary' }, daysBack: 26, hour: 10, minute: 30 },
  { actor: 'admin@finstack.com',          action: 'USER_CREATED',         resourceType: 'user',        resourceId: 'usr_2501', sourceService: 'user-management-service', metadata: { newUserEmail: 'intern@finstack.com' }, daysBack: 25, hour: 14, minute: 20 },
  { actor: 'admin@finstack.com',          action: 'PERMISSION_CHANGED',   resourceType: 'user',        resourceId: 'usr_2501', sourceService: 'user-management-service', metadata: { from: 'VIEWER', to: 'ANALYST' }, daysBack: 25, hour: 14, minute: 25 },
  { actor: 'alice.johnson@finstack.com',  action: 'TRANSACTION_APPROVED', resourceType: 'transaction', resourceId: 'txn_2490', sourceService: 'transaction-service',     metadata: { amount: 47000, currency: 'INR' }, daysBack: 24, hour: 11, minute: 5 },
  { actor: 'charlie.zhang@finstack.com',  action: 'RECORD_READ',          resourceType: 'transaction', resourceId: 'txn_2480', sourceService: 'transaction-service',     metadata: { amount: 3200 },  daysBack: 24, hour: 11, minute: 45 },
  { actor: 'auditor@finstack.com',        action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_005', sourceService: 'auth-service',            metadata: { ip: '10.0.0.2' }, daysBack: 23, hour: 9, minute: 0 },
  { actor: 'auditor@finstack.com',        action: 'RECORD_READ',          resourceType: 'audit_log',   resourceId: 'log_2301', sourceService: 'reporting-service',       metadata: { range: 'last_7_days' }, daysBack: 23, hour: 9, minute: 20 },
  { actor: 'system@finstack.com',         action: 'REPORT_GENERATED',     resourceType: 'report',      resourceId: 'rpt_2201', sourceService: 'reporting-service',       metadata: { type: 'daily_digest', scheduled: true }, daysBack: 22, hour: 0, minute: 5 },

  // ── Days 21–15 ago: moderate activity ────────────────────────────────────

  { actor: 'alice.johnson@finstack.com',  action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_010', sourceService: 'auth-service',            metadata: { ip: '10.0.0.5' }, daysBack: 21, hour: 9,  minute: 2 },
  { actor: 'alice.johnson@finstack.com',  action: 'DATA_EXPORTED',        resourceType: 'report',      resourceId: 'rpt_2101', sourceService: 'reporting-service',       metadata: { recordsCount: 200, format: 'csv' }, daysBack: 21, hour: 9,  minute: 45 },
  { actor: 'bob.smith@finstack.com',      action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_011', sourceService: 'auth-service',            metadata: { ip: '10.0.2.1' }, daysBack: 21, hour: 10, minute: 0 },
  { actor: 'bob.smith@finstack.com',      action: 'RECORD_READ',          resourceType: 'transaction', resourceId: 'txn_2100', sourceService: 'transaction-service',     metadata: { amount: 18500 }, daysBack: 21, hour: 10, minute: 15 },
  { actor: 'charlie.zhang@finstack.com',  action: 'TRANSACTION_APPROVED', resourceType: 'transaction', resourceId: 'txn_2090', sourceService: 'transaction-service',     metadata: { amount: 62000, currency: 'INR' }, daysBack: 20, hour: 11, minute: 30 },
  { actor: 'analyst@finstack.com',        action: 'RECORD_READ',          resourceType: 'transaction', resourceId: 'txn_2080', sourceService: 'transaction-service',     metadata: { amount: 9900 },  daysBack: 20, hour: 13, minute: 45 },
  { actor: 'admin@finstack.com',          action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_012', sourceService: 'auth-service',            metadata: { ip: '10.0.0.1' }, daysBack: 19, hour: 8, minute: 55 },
  { actor: 'admin@finstack.com',          action: 'PERMISSION_CHANGED',   resourceType: 'user',        resourceId: 'usr_1901', sourceService: 'user-management-service', metadata: { from: 'ANALYST', to: 'AUDITOR' }, daysBack: 19, hour: 9, minute: 30 },
  { actor: 'auditor@finstack.com',        action: 'DATA_EXPORTED',        resourceType: 'audit_log',   resourceId: 'log_1801', sourceService: 'reporting-service',       metadata: { recordsCount: 450, format: 'json' }, daysBack: 18, hour: 14, minute: 10 },
  { actor: 'alice.johnson@finstack.com',  action: 'TRANSACTION_REJECTED', resourceType: 'transaction', resourceId: 'txn_1800', sourceService: 'transaction-service',     metadata: { reason: 'limit_exceeded', amount: 500000 }, daysBack: 18, hour: 15, minute: 5 },
  { actor: 'bob.smith@finstack.com',      action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_013', sourceService: 'auth-service',            metadata: { ip: '10.0.2.1' }, daysBack: 17, hour: 9, minute: 5 },
  { actor: 'bob.smith@finstack.com',      action: 'RECORD_READ',          resourceType: 'transaction', resourceId: 'txn_1700', sourceService: 'transaction-service',     metadata: { amount: 7800 },  daysBack: 17, hour: 9, minute: 25 },
  { actor: 'charlie.zhang@finstack.com',  action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_014', sourceService: 'auth-service',            metadata: { ip: '10.0.0.8' }, daysBack: 16, hour: 10, minute: 0 },
  { actor: 'charlie.zhang@finstack.com',  action: 'TRANSACTION_APPROVED', resourceType: 'transaction', resourceId: 'txn_1600', sourceService: 'transaction-service',     metadata: { amount: 34000, currency: 'INR' }, daysBack: 16, hour: 10, minute: 40 },
  { actor: 'system@finstack.com',         action: 'REPORT_GENERATED',     resourceType: 'report',      resourceId: 'rpt_1601', sourceService: 'reporting-service',       metadata: { type: 'daily_digest', scheduled: true }, daysBack: 16, hour: 0, minute: 3 },
  { actor: 'analyst@finstack.com',        action: 'REPORT_GENERATED',     resourceType: 'report',      resourceId: 'rpt_1501', sourceService: 'reporting-service',       metadata: { type: 'weekly_risk' }, daysBack: 15, hour: 11, minute: 0 },

  // ── Days 14–8 ago: higher activity, a password reset ─────────────────────

  { actor: 'admin@finstack.com',          action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_020', sourceService: 'auth-service',            metadata: { ip: '10.0.0.1' }, daysBack: 14, hour: 8, minute: 50 },
  { actor: 'admin@finstack.com',          action: 'USER_CREATED',         resourceType: 'user',        resourceId: 'usr_1401', sourceService: 'user-management-service', metadata: { newUserEmail: 'newdev@finstack.com' }, daysBack: 14, hour: 9, minute: 15 },
  { actor: 'alice.johnson@finstack.com',  action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_021', sourceService: 'auth-service',            metadata: { ip: '10.0.0.5' }, daysBack: 14, hour: 9, minute: 20 },
  { actor: 'alice.johnson@finstack.com',  action: 'RECORD_READ',          resourceType: 'transaction', resourceId: 'txn_1400', sourceService: 'transaction-service',     metadata: { amount: 21000 }, daysBack: 14, hour: 9, minute: 50 },
  { actor: 'alice.johnson@finstack.com',  action: 'TRANSACTION_APPROVED', resourceType: 'transaction', resourceId: 'txn_1401', sourceService: 'transaction-service',     metadata: { amount: 58000, currency: 'INR' }, daysBack: 14, hour: 10, minute: 30 },
  { actor: 'bob.smith@finstack.com',      action: 'LOGIN_FAILED',         resourceType: 'session',     resourceId: 'sess_fail_01', sourceService: 'auth-service',        metadata: { ip: '192.168.1.100', reason: 'wrong_password' }, daysBack: 13, hour: 8, minute: 1 },
  { actor: 'bob.smith@finstack.com',      action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_022', sourceService: 'auth-service',            metadata: { ip: '10.0.2.1' }, daysBack: 13, hour: 9, minute: 0 },
  { actor: 'bob.smith@finstack.com',      action: 'PASSWORD_CHANGED',     resourceType: 'user',        resourceId: 'usr_bob',  sourceService: 'user-management-service', metadata: { reason: 'user_requested' }, daysBack: 13, hour: 9, minute: 5 },
  { actor: 'charlie.zhang@finstack.com',  action: 'RECORD_READ',          resourceType: 'transaction', resourceId: 'txn_1300', sourceService: 'transaction-service',     metadata: { amount: 15000 }, daysBack: 13, hour: 11, minute: 20 },
  { actor: 'auditor@finstack.com',        action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_023', sourceService: 'auth-service',            metadata: { ip: '10.0.0.2' }, daysBack: 12, hour: 9, minute: 0 },
  { actor: 'auditor@finstack.com',        action: 'RECORD_READ',          resourceType: 'audit_log',   resourceId: 'log_1201', sourceService: 'reporting-service',       metadata: { range: 'last_30_days' }, daysBack: 12, hour: 9, minute: 30 },
  { actor: 'analyst@finstack.com',        action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_024', sourceService: 'auth-service',            metadata: { ip: '10.0.0.3' }, daysBack: 11, hour: 10, minute: 10 },
  { actor: 'analyst@finstack.com',        action: 'TRANSACTION_REJECTED', resourceType: 'transaction', resourceId: 'txn_1101', sourceService: 'transaction-service',     metadata: { reason: 'fraud_flag', amount: 800000 }, daysBack: 11, hour: 10, minute: 45 },
  { actor: 'alice.johnson@finstack.com',  action: 'DATA_EXPORTED',        resourceType: 'report',      resourceId: 'rpt_1001', sourceService: 'reporting-service',       metadata: { recordsCount: 650, format: 'csv' }, daysBack: 10, hour: 14, minute: 0 },
  { actor: 'charlie.zhang@finstack.com',  action: 'TRANSACTION_APPROVED', resourceType: 'transaction', resourceId: 'txn_1000', sourceService: 'transaction-service',     metadata: { amount: 91000, currency: 'INR' }, daysBack: 10, hour: 15, minute: 20 },
  { actor: 'system@finstack.com',         action: 'REPORT_GENERATED',     resourceType: 'report',      resourceId: 'rpt_0901', sourceService: 'reporting-service',       metadata: { type: 'daily_digest', scheduled: true }, daysBack: 9, hour: 0, minute: 4 },
  { actor: 'admin@finstack.com',          action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_025', sourceService: 'auth-service',            metadata: { ip: '10.0.0.1' }, daysBack: 9, hour: 9, minute: 5 },
  { actor: 'admin@finstack.com',          action: 'PERMISSION_CHANGED',   resourceType: 'user',        resourceId: 'usr_0901', sourceService: 'user-management-service', metadata: { from: 'VIEWER', to: 'ANALYST' }, daysBack: 9, hour: 9, minute: 30 },
  { actor: 'bob.smith@finstack.com',      action: 'RECORD_READ',          resourceType: 'transaction', resourceId: 'txn_0900', sourceService: 'transaction-service',     metadata: { amount: 5500 },  daysBack: 9, hour: 11, minute: 0 },
  { actor: 'auditor@finstack.com',        action: 'DATA_EXPORTED',        resourceType: 'audit_log',   resourceId: 'log_0801', sourceService: 'reporting-service',       metadata: { recordsCount: 300, format: 'json' }, daysBack: 8, hour: 14, minute: 30 },

  // ── Days 7–3 ago: busy week ───────────────────────────────────────────────

  { actor: 'alice.johnson@finstack.com',  action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_030', sourceService: 'auth-service',            metadata: { ip: '10.0.0.5' }, daysBack: 7, hour: 8, minute: 55 },
  { actor: 'alice.johnson@finstack.com',  action: 'RECORD_READ',          resourceType: 'transaction', resourceId: 'txn_0700', sourceService: 'transaction-service',     metadata: { amount: 33000 }, daysBack: 7, hour: 9, minute: 10 },
  { actor: 'alice.johnson@finstack.com',  action: 'TRANSACTION_APPROVED', resourceType: 'transaction', resourceId: 'txn_0701', sourceService: 'transaction-service',     metadata: { amount: 72000, currency: 'INR' }, daysBack: 7, hour: 9, minute: 45 },
  { actor: 'charlie.zhang@finstack.com',  action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_031', sourceService: 'auth-service',            metadata: { ip: '10.0.0.8' }, daysBack: 7, hour: 10, minute: 0 },
  { actor: 'charlie.zhang@finstack.com',  action: 'RECORD_READ',          resourceType: 'transaction', resourceId: 'txn_0702', sourceService: 'transaction-service',     metadata: { amount: 28000 }, daysBack: 7, hour: 10, minute: 25 },
  { actor: 'analyst@finstack.com',        action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_032', sourceService: 'auth-service',            metadata: { ip: '10.0.0.3' }, daysBack: 7, hour: 11, minute: 0 },
  { actor: 'analyst@finstack.com',        action: 'REPORT_GENERATED',     resourceType: 'report',      resourceId: 'rpt_0701', sourceService: 'reporting-service',       metadata: { type: 'weekly_risk' }, daysBack: 7, hour: 11, minute: 30 },
  { actor: 'bob.smith@finstack.com',      action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_033', sourceService: 'auth-service',            metadata: { ip: '10.0.2.1' }, daysBack: 6, hour: 9,  minute: 0 },
  { actor: 'bob.smith@finstack.com',      action: 'TRANSACTION_APPROVED', resourceType: 'transaction', resourceId: 'txn_0601', sourceService: 'transaction-service',     metadata: { amount: 44000, currency: 'INR' }, daysBack: 6, hour: 9,  minute: 30 },
  { actor: 'bob.smith@finstack.com',      action: 'RECORD_READ',          resourceType: 'transaction', resourceId: 'txn_0602', sourceService: 'transaction-service',     metadata: { amount: 11000 }, daysBack: 6, hour: 10, minute: 10 },
  { actor: 'admin@finstack.com',          action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_034', sourceService: 'auth-service',            metadata: { ip: '10.0.0.1' }, daysBack: 6, hour: 14, minute: 0 },
  { actor: 'admin@finstack.com',          action: 'USER_CREATED',         resourceType: 'user',        resourceId: 'usr_0601', sourceService: 'user-management-service', metadata: { newUserEmail: 'contractor@finstack.com' }, daysBack: 6, hour: 14, minute: 20 },
  { actor: 'auditor@finstack.com',        action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_035', sourceService: 'auth-service',            metadata: { ip: '10.0.0.2' }, daysBack: 5, hour: 9, minute: 0 },
  { actor: 'auditor@finstack.com',        action: 'RECORD_READ',          resourceType: 'audit_log',   resourceId: 'log_0501', sourceService: 'reporting-service',       metadata: { range: 'last_7_days' }, daysBack: 5, hour: 9, minute: 20 },
  { actor: 'auditor@finstack.com',        action: 'REPORT_GENERATED',     resourceType: 'report',      resourceId: 'rpt_0501', sourceService: 'reporting-service',       metadata: { type: 'compliance_check' }, daysBack: 5, hour: 10, minute: 0 },
  { actor: 'alice.johnson@finstack.com',  action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_036', sourceService: 'auth-service',            metadata: { ip: '10.0.0.5' }, daysBack: 5, hour: 10, minute: 30 },
  { actor: 'alice.johnson@finstack.com',  action: 'TRANSACTION_APPROVED', resourceType: 'transaction', resourceId: 'txn_0500', sourceService: 'transaction-service',     metadata: { amount: 85000, currency: 'INR' }, daysBack: 5, hour: 11, minute: 0 },
  { actor: 'alice.johnson@finstack.com',  action: 'TRANSACTION_REJECTED', resourceType: 'transaction', resourceId: 'txn_0501', sourceService: 'transaction-service',     metadata: { reason: 'compliance_hold', amount: 2500000 }, daysBack: 5, hour: 11, minute: 30 },
  { actor: 'charlie.zhang@finstack.com',  action: 'TRANSACTION_APPROVED', resourceType: 'transaction', resourceId: 'txn_0400', sourceService: 'transaction-service',     metadata: { amount: 55000, currency: 'INR' }, daysBack: 4, hour: 10, minute: 0 },
  { actor: 'charlie.zhang@finstack.com',  action: 'RECORD_READ',          resourceType: 'transaction', resourceId: 'txn_0401', sourceService: 'transaction-service',     metadata: { amount: 7200 },  daysBack: 4, hour: 10, minute: 35 },
  { actor: 'analyst@finstack.com',        action: 'DATA_EXPORTED',        resourceType: 'report',      resourceId: 'rpt_0401', sourceService: 'reporting-service',       metadata: { recordsCount: 120, format: 'csv' }, daysBack: 4, hour: 13, minute: 0 },
  { actor: 'bob.smith@finstack.com',      action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_037', sourceService: 'auth-service',            metadata: { ip: '10.0.2.1' }, daysBack: 4, hour: 14, minute: 0 },
  { actor: 'bob.smith@finstack.com',      action: 'RECORD_READ',          resourceType: 'transaction', resourceId: 'txn_0402', sourceService: 'transaction-service',     metadata: { amount: 9300 },  daysBack: 4, hour: 14, minute: 20 },
  { actor: 'system@finstack.com',         action: 'REPORT_GENERATED',     resourceType: 'report',      resourceId: 'rpt_0301', sourceService: 'reporting-service',       metadata: { type: 'daily_digest', scheduled: true }, daysBack: 3, hour: 0, minute: 2 },
  { actor: 'admin@finstack.com',          action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_038', sourceService: 'auth-service',            metadata: { ip: '10.0.0.1' }, daysBack: 3, hour: 9, minute: 0 },
  { actor: 'admin@finstack.com',          action: 'PERMISSION_CHANGED',   resourceType: 'user',        resourceId: 'usr_0301', sourceService: 'user-management-service', metadata: { from: 'VIEWER', to: 'AUDITOR' }, daysBack: 3, hour: 9, minute: 20 },
  { actor: 'alice.johnson@finstack.com',  action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_039', sourceService: 'auth-service',            metadata: { ip: '10.0.0.5' }, daysBack: 3, hour: 10, minute: 5 },

  // ── SUSPICIOUS PATTERN 1: bob.smith brute-force (6 failures within 8 min)
  // All on the same day, close together. This WILL trigger MULTIPLE_FAILED_LOGINS.

  { actor: 'bob.smith@finstack.com', action: 'LOGIN_FAILED', resourceType: 'session', resourceId: 'sess_bf_01', sourceService: 'auth-service', metadata: { ip: '203.0.113.45', reason: 'wrong_password', attempt: 1 }, daysBack: 2, hour: 2, minute: 10 },
  { actor: 'bob.smith@finstack.com', action: 'LOGIN_FAILED', resourceType: 'session', resourceId: 'sess_bf_02', sourceService: 'auth-service', metadata: { ip: '203.0.113.45', reason: 'wrong_password', attempt: 2 }, daysBack: 2, hour: 2, minute: 12 },
  { actor: 'bob.smith@finstack.com', action: 'LOGIN_FAILED', resourceType: 'session', resourceId: 'sess_bf_03', sourceService: 'auth-service', metadata: { ip: '203.0.113.45', reason: 'wrong_password', attempt: 3 }, daysBack: 2, hour: 2, minute: 14 },
  { actor: 'bob.smith@finstack.com', action: 'LOGIN_FAILED', resourceType: 'session', resourceId: 'sess_bf_04', sourceService: 'auth-service', metadata: { ip: '203.0.113.45', reason: 'wrong_password', attempt: 4 }, daysBack: 2, hour: 2, minute: 15 },
  { actor: 'bob.smith@finstack.com', action: 'LOGIN_FAILED', resourceType: 'session', resourceId: 'sess_bf_05', sourceService: 'auth-service', metadata: { ip: '203.0.113.45', reason: 'wrong_password', attempt: 5 }, daysBack: 2, hour: 2, minute: 17 },
  { actor: 'bob.smith@finstack.com', action: 'LOGIN_FAILED', resourceType: 'session', resourceId: 'sess_bf_06', sourceService: 'auth-service', metadata: { ip: '203.0.113.45', reason: 'wrong_password', attempt: 6 }, daysBack: 2, hour: 2, minute: 18 },

  // ── SUSPICIOUS PATTERN 2: alice.johnson exports 1500 records (triggers BULK_DATA_EXPORT)

  { actor: 'alice.johnson@finstack.com',  action: 'DATA_EXPORTED',        resourceType: 'transaction', resourceId: 'bulk_exp_001', sourceService: 'reporting-service', metadata: { recordsCount: 1500, format: 'csv', note: 'Q3 full dump' }, daysBack: 2, hour: 3, minute: 30 },

  // ── SUSPICIOUS PATTERN 3: admin changes permissions late at night (AFTER_HOURS_ADMIN_ACTIVITY)

  { actor: 'admin@finstack.com',          action: 'PERMISSION_CHANGED',   resourceType: 'user',        resourceId: 'usr_late_01', sourceService: 'user-management-service', metadata: { from: 'ANALYST', to: 'TENANT_ADMIN' }, daysBack: 2, hour: 22, minute: 40 },

  // ── More normal day-2 activity ────────────────────────────────────────────

  { actor: 'charlie.zhang@finstack.com',  action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_040', sourceService: 'auth-service',            metadata: { ip: '10.0.0.8' }, daysBack: 2, hour: 9, minute: 0 },
  { actor: 'charlie.zhang@finstack.com',  action: 'TRANSACTION_APPROVED', resourceType: 'transaction', resourceId: 'txn_0201', sourceService: 'transaction-service',     metadata: { amount: 38000, currency: 'INR' }, daysBack: 2, hour: 9, minute: 30 },
  { actor: 'analyst@finstack.com',        action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_041', sourceService: 'auth-service',            metadata: { ip: '10.0.0.3' }, daysBack: 2, hour: 10, minute: 0 },
  { actor: 'analyst@finstack.com',        action: 'RECORD_READ',          resourceType: 'transaction', resourceId: 'txn_0202', sourceService: 'transaction-service',     metadata: { amount: 16500 }, daysBack: 2, hour: 10, minute: 20 },
  { actor: 'auditor@finstack.com',        action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_042', sourceService: 'auth-service',            metadata: { ip: '10.0.0.2' }, daysBack: 2, hour: 11, minute: 0 },
  { actor: 'auditor@finstack.com',        action: 'DATA_EXPORTED',        resourceType: 'audit_log',   resourceId: 'log_0201', sourceService: 'reporting-service',       metadata: { recordsCount: 750, format: 'json' }, daysBack: 2, hour: 11, minute: 30 },
  { actor: 'admin@finstack.com',          action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_043', sourceService: 'auth-service',            metadata: { ip: '10.0.0.1' }, daysBack: 2, hour: 14, minute: 0 },
  { actor: 'admin@finstack.com',          action: 'PASSWORD_CHANGED',     resourceType: 'user',        resourceId: 'usr_admin', sourceService: 'user-management-service', metadata: { reason: 'periodic_rotation' }, daysBack: 2, hour: 14, minute: 15 },

  // ── Last 24 hours: concentrated recent activity (makes the trend chart lively) ──

  { actor: 'alice.johnson@finstack.com',  action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_100', sourceService: 'auth-service',            metadata: { ip: '10.0.0.5' }, daysBack: 1, hour: 8,  minute: 5  },
  { actor: 'alice.johnson@finstack.com',  action: 'RECORD_READ',          resourceType: 'transaction', resourceId: 'txn_0100', sourceService: 'transaction-service',     metadata: { amount: 44000 }, daysBack: 1, hour: 8,  minute: 20 },
  { actor: 'alice.johnson@finstack.com',  action: 'TRANSACTION_APPROVED', resourceType: 'transaction', resourceId: 'txn_0101', sourceService: 'transaction-service',     metadata: { amount: 95000, currency: 'INR' }, daysBack: 1, hour: 8, minute: 50 },
  { actor: 'bob.smith@finstack.com',      action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_101', sourceService: 'auth-service',            metadata: { ip: '10.0.2.1' }, daysBack: 1, hour: 9,  minute: 0  },
  { actor: 'bob.smith@finstack.com',      action: 'RECORD_READ',          resourceType: 'transaction', resourceId: 'txn_0102', sourceService: 'transaction-service',     metadata: { amount: 12500 }, daysBack: 1, hour: 9,  minute: 15 },
  { actor: 'charlie.zhang@finstack.com',  action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_102', sourceService: 'auth-service',            metadata: { ip: '10.0.0.8' }, daysBack: 1, hour: 9,  minute: 20 },
  { actor: 'charlie.zhang@finstack.com',  action: 'TRANSACTION_APPROVED', resourceType: 'transaction', resourceId: 'txn_0103', sourceService: 'transaction-service',     metadata: { amount: 61000, currency: 'INR' }, daysBack: 1, hour: 9, minute: 55 },
  { actor: 'analyst@finstack.com',        action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_103', sourceService: 'auth-service',            metadata: { ip: '10.0.0.3' }, daysBack: 1, hour: 10, minute: 0  },
  { actor: 'analyst@finstack.com',        action: 'REPORT_GENERATED',     resourceType: 'report',      resourceId: 'rpt_0101', sourceService: 'reporting-service',       metadata: { type: 'daily_risk' }, daysBack: 1, hour: 10, minute: 30 },
  { actor: 'auditor@finstack.com',        action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_104', sourceService: 'auth-service',            metadata: { ip: '10.0.0.2' }, daysBack: 1, hour: 10, minute: 35 },
  { actor: 'auditor@finstack.com',        action: 'RECORD_READ',          resourceType: 'audit_log',   resourceId: 'log_0101', sourceService: 'reporting-service',       metadata: { range: 'last_7_days' }, daysBack: 1, hour: 11, minute: 0 },
  { actor: 'admin@finstack.com',          action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_105', sourceService: 'auth-service',            metadata: { ip: '10.0.0.1' }, daysBack: 1, hour: 11, minute: 10 },
  { actor: 'admin@finstack.com',          action: 'PERMISSION_CHANGED',   resourceType: 'user',        resourceId: 'usr_0102', sourceService: 'user-management-service', metadata: { from: 'ANALYST', to: 'AUDITOR' }, daysBack: 1, hour: 11, minute: 25 },
  { actor: 'alice.johnson@finstack.com',  action: 'RECORD_READ',          resourceType: 'transaction', resourceId: 'txn_0104', sourceService: 'transaction-service',     metadata: { amount: 9800 },  daysBack: 1, hour: 12, minute: 5  },
  { actor: 'alice.johnson@finstack.com',  action: 'TRANSACTION_REJECTED', resourceType: 'transaction', resourceId: 'txn_0105', sourceService: 'transaction-service',     metadata: { reason: 'kyc_pending', amount: 350000 }, daysBack: 1, hour: 12, minute: 30 },
  { actor: 'bob.smith@finstack.com',      action: 'TRANSACTION_APPROVED', resourceType: 'transaction', resourceId: 'txn_0106', sourceService: 'transaction-service',     metadata: { amount: 27000, currency: 'INR' }, daysBack: 1, hour: 13, minute: 0 },
  { actor: 'charlie.zhang@finstack.com',  action: 'DATA_EXPORTED',        resourceType: 'report',      resourceId: 'rpt_0102', sourceService: 'reporting-service',       metadata: { recordsCount: 180, format: 'csv' }, daysBack: 1, hour: 13, minute: 30 },
  { actor: 'auditor@finstack.com',        action: 'REPORT_GENERATED',     resourceType: 'report',      resourceId: 'rpt_0103', sourceService: 'reporting-service',       metadata: { type: 'compliance_check' }, daysBack: 1, hour: 14, minute: 0 },
  { actor: 'analyst@finstack.com',        action: 'RECORD_READ',          resourceType: 'transaction', resourceId: 'txn_0107', sourceService: 'transaction-service',     metadata: { amount: 53000 }, daysBack: 1, hour: 14, minute: 20 },
  { actor: 'bob.smith@finstack.com',      action: 'RECORD_READ',          resourceType: 'transaction', resourceId: 'txn_0108', sourceService: 'transaction-service',     metadata: { amount: 6700 },  daysBack: 1, hour: 15, minute: 0  },
  { actor: 'alice.johnson@finstack.com',  action: 'TRANSACTION_APPROVED', resourceType: 'transaction', resourceId: 'txn_0109', sourceService: 'transaction-service',     metadata: { amount: 67000, currency: 'INR' }, daysBack: 1, hour: 15, minute: 40 },
  { actor: 'charlie.zhang@finstack.com',  action: 'RECORD_READ',          resourceType: 'transaction', resourceId: 'txn_0110', sourceService: 'transaction-service',     metadata: { amount: 22000 }, daysBack: 1, hour: 16, minute: 10 },
  { actor: 'admin@finstack.com',          action: 'USER_CREATED',         resourceType: 'user',        resourceId: 'usr_0103', sourceService: 'user-management-service', metadata: { newUserEmail: 'trainee2@finstack.com' }, daysBack: 1, hour: 16, minute: 30 },
  { actor: 'auditor@finstack.com',        action: 'DATA_EXPORTED',        resourceType: 'audit_log',   resourceId: 'log_0102', sourceService: 'reporting-service',       metadata: { recordsCount: 500, format: 'json' }, daysBack: 1, hour: 17, minute: 0 },
  { actor: 'system@finstack.com',         action: 'REPORT_GENERATED',     resourceType: 'report',      resourceId: 'rpt_0104', sourceService: 'reporting-service',       metadata: { type: 'daily_digest', scheduled: true }, daysBack: 0, hour: 0, minute: 1 },
  { actor: 'alice.johnson@finstack.com',  action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_200', sourceService: 'auth-service',            metadata: { ip: '10.0.0.5' }, daysBack: 0, hour: 8,  minute: 10 },
  { actor: 'alice.johnson@finstack.com',  action: 'RECORD_READ',          resourceType: 'transaction', resourceId: 'txn_today_01', sourceService: 'transaction-service', metadata: { amount: 39000 }, daysBack: 0, hour: 8,  minute: 30 },
  { actor: 'bob.smith@finstack.com',      action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_201', sourceService: 'auth-service',            metadata: { ip: '10.0.2.1' }, daysBack: 0, hour: 9,  minute: 0  },
  { actor: 'bob.smith@finstack.com',      action: 'TRANSACTION_APPROVED', resourceType: 'transaction', resourceId: 'txn_today_02', sourceService: 'transaction-service', metadata: { amount: 48000, currency: 'INR' }, daysBack: 0, hour: 9, minute: 20 },
  { actor: 'charlie.zhang@finstack.com',  action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_202', sourceService: 'auth-service',            metadata: { ip: '10.0.0.8' }, daysBack: 0, hour: 9,  minute: 30 },
  { actor: 'analyst@finstack.com',        action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_203', sourceService: 'auth-service',            metadata: { ip: '10.0.0.3' }, daysBack: 0, hour: 10, minute: 0  },
  { actor: 'analyst@finstack.com',        action: 'REPORT_GENERATED',     resourceType: 'report',      resourceId: 'rpt_today_01', sourceService: 'reporting-service',   metadata: { type: 'intraday_summary' }, daysBack: 0, hour: 10, minute: 15 },
  { actor: 'charlie.zhang@finstack.com',  action: 'TRANSACTION_APPROVED', resourceType: 'transaction', resourceId: 'txn_today_03', sourceService: 'transaction-service', metadata: { amount: 76000, currency: 'INR' }, daysBack: 0, hour: 10, minute: 30 },
  { actor: 'alice.johnson@finstack.com',  action: 'TRANSACTION_APPROVED', resourceType: 'transaction', resourceId: 'txn_today_04', sourceService: 'transaction-service', metadata: { amount: 103000, currency: 'INR' }, daysBack: 0, hour: 11, minute: 0 },
  { actor: 'auditor@finstack.com',        action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_204', sourceService: 'auth-service',            metadata: { ip: '10.0.0.2' }, daysBack: 0, hour: 11, minute: 10 },
  { actor: 'auditor@finstack.com',        action: 'RECORD_READ',          resourceType: 'audit_log',   resourceId: 'log_today_01', sourceService: 'reporting-service',   metadata: { range: 'today' }, daysBack: 0, hour: 11, minute: 30 },
  { actor: 'admin@finstack.com',          action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_205', sourceService: 'auth-service',            metadata: { ip: '10.0.0.1' }, daysBack: 0, hour: 12, minute: 0  },
  { actor: 'bob.smith@finstack.com',      action: 'RECORD_READ',          resourceType: 'transaction', resourceId: 'txn_today_05', sourceService: 'transaction-service', metadata: { amount: 8100 },  daysBack: 0, hour: 12, minute: 20 },
  { actor: 'charlie.zhang@finstack.com',  action: 'RECORD_READ',          resourceType: 'transaction', resourceId: 'txn_today_06', sourceService: 'transaction-service', metadata: { amount: 19500 }, daysBack: 0, hour: 13, minute: 5  },
  { actor: 'alice.johnson@finstack.com',  action: 'DATA_EXPORTED',        resourceType: 'report',      resourceId: 'rpt_today_02', sourceService: 'reporting-service',   metadata: { recordsCount: 95, format: 'csv' }, daysBack: 0, hour: 13, minute: 30 },
  { actor: 'analyst@finstack.com',        action: 'TRANSACTION_APPROVED', resourceType: 'transaction', resourceId: 'txn_today_07', sourceService: 'transaction-service', metadata: { amount: 52000, currency: 'INR' }, daysBack: 0, hour: 14, minute: 0 },
  { actor: 'admin@finstack.com',          action: 'PERMISSION_CHANGED',   resourceType: 'user',        resourceId: 'usr_today_01', sourceService: 'user-management-service', metadata: { from: 'VIEWER', to: 'ANALYST' }, daysBack: 0, hour: 14, minute: 20 },
  { actor: 'bob.smith@finstack.com',      action: 'RECORD_READ',          resourceType: 'transaction', resourceId: 'txn_today_08', sourceService: 'transaction-service', metadata: { amount: 31000 }, daysBack: 0, hour: 15, minute: 0  },

  // ── Extra events to round out to 150 ─────────────────────────────────────
  { actor: 'charlie.zhang@finstack.com',  action: 'TRANSACTION_APPROVED', resourceType: 'transaction', resourceId: 'txn_today_09', sourceService: 'transaction-service', metadata: { amount: 41000, currency: 'INR' }, daysBack: 0, hour: 15, minute: 30 },
  { actor: 'alice.johnson@finstack.com',  action: 'RECORD_READ',          resourceType: 'transaction', resourceId: 'txn_today_10', sourceService: 'transaction-service', metadata: { amount: 23500 }, daysBack: 0, hour: 15, minute: 45 },
  { actor: 'auditor@finstack.com',        action: 'REPORT_GENERATED',     resourceType: 'report',      resourceId: 'rpt_today_03', sourceService: 'reporting-service',   metadata: { type: 'end_of_day' }, daysBack: 0, hour: 16, minute: 0 },
  { actor: 'analyst@finstack.com',        action: 'RECORD_READ',          resourceType: 'transaction', resourceId: 'txn_today_11', sourceService: 'transaction-service', metadata: { amount: 17200 }, daysBack: 0, hour: 16, minute: 20 },
  { actor: 'bob.smith@finstack.com',      action: 'TRANSACTION_APPROVED', resourceType: 'transaction', resourceId: 'txn_today_12', sourceService: 'transaction-service', metadata: { amount: 36500, currency: 'INR' }, daysBack: 0, hour: 16, minute: 40 },
  { actor: 'admin@finstack.com',          action: 'USER_CREATED',         resourceType: 'user',        resourceId: 'usr_today_02', sourceService: 'user-management-service', metadata: { newUserEmail: 'qa@finstack.com' }, daysBack: 0, hour: 16, minute: 55 },
  { actor: 'charlie.zhang@finstack.com',  action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_today_01', sourceService: 'auth-service',       metadata: { ip: '10.0.0.8' }, daysBack: 0, hour: 17, minute: 0 },
  { actor: 'alice.johnson@finstack.com',  action: 'TRANSACTION_REJECTED', resourceType: 'transaction', resourceId: 'txn_today_13', sourceService: 'transaction-service', metadata: { reason: 'daily_limit', amount: 750000 }, daysBack: 0, hour: 17, minute: 10 },
  { actor: 'system@finstack.com',         action: 'REPORT_GENERATED',     resourceType: 'report',      resourceId: 'rpt_today_04', sourceService: 'reporting-service',   metadata: { type: 'hourly_alert_summary', scheduled: true }, daysBack: 0, hour: 17, minute: 0 },
  { actor: 'auditor@finstack.com',        action: 'RECORD_READ',          resourceType: 'audit_log',   resourceId: 'log_today_02', sourceService: 'reporting-service',   metadata: { range: 'today' }, daysBack: 0, hour: 17, minute: 30 },
  { actor: 'analyst@finstack.com',        action: 'DATA_EXPORTED',        resourceType: 'report',      resourceId: 'rpt_today_05', sourceService: 'reporting-service',   metadata: { recordsCount: 210, format: 'csv' }, daysBack: 0, hour: 17, minute: 45 },
  { actor: 'bob.smith@finstack.com',      action: 'LOGIN_SUCCESS',        resourceType: 'session',     resourceId: 'sess_today_02', sourceService: 'auth-service',       metadata: { ip: '10.0.2.1' }, daysBack: 0, hour: 18, minute: 0 },
];

// ── Detection definitions ─────────────────────────────────────────────────────
//
// ruleDescription matches the text detection.rules.ts produces.
// eventResourceIds point at the suspicious events above; their real DB ids become
// supportingEventIds, and the last one's timestamp becomes triggeredAt.

const DETECTIONS = [
  {
    ruleName:         'MULTIPLE_FAILED_LOGINS',
    ruleDescription:  'Actor exceeded 5 failed login attempts in 10 minutes.',
    severity:         DetectionSeverity.HIGH,
    status:           DetectionStatus.OPEN,
    actor:            'bob.smith@finstack.com',
    eventResourceIds: ['sess_bf_01', 'sess_bf_02', 'sess_bf_03', 'sess_bf_04', 'sess_bf_05', 'sess_bf_06'],
    metadata:         { failureCount: 6 },
  },
  {
    ruleName:         'BULK_DATA_EXPORT',
    ruleDescription:  'Actor exported 1500 records at once.',
    severity:         DetectionSeverity.MEDIUM,
    status:           DetectionStatus.OPEN,
    actor:            'alice.johnson@finstack.com',
    eventResourceIds: ['bulk_exp_001'],
    metadata:         { recordsCount: 1500 },
  },
  {
    ruleName:         'AFTER_HOURS_ADMIN_ACTIVITY',
    ruleDescription:  'Admin activity detected at hour 22.',
    severity:         DetectionSeverity.LOW,
    status:           DetectionStatus.RESOLVED,
    actor:            'admin@finstack.com',
    eventResourceIds: ['usr_late_01'],
    metadata:         { hourOfDay: 22 },
  },
];

// ── Main seed function ────────────────────────────────────────────────────────

async function seed(): Promise<void> {
  const adapter = new PrismaPg({
    connectionString: process.env['DATABASE_URL'] as string,
  });
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('🌱 Seeding development database...\n');

    // ── Step 1: Upsert tenants ──────────────────────────────────────────────
    let finstackId = '';
    for (const t of TENANTS) {
      const hashedKey = hashApiKey(t.rawApiKey);
      const tenant = await prisma.tenant.upsert({
        where:  { apiKey: hashedKey },
        update: { name: t.name },
        create: { name: t.name, apiKey: hashedKey },
      });
      if (t.name === 'FinStack') finstackId = tenant.id;
      console.log(`✅ Tenant: ${tenant.name}  (key: ${t.rawApiKey})`);
    }

    // ── Step 2: Upsert RBAC users for FinStack ──────────────────────────────
    console.log('\n👤 Seeding RBAC users for FinStack...');
    const passwordHash = await bcrypt.hash('password123', 10);
    const seedUsers = [
      { email: 'superadmin@traceiq.io', role: Role.SUPER_ADMIN },
      { email: 'admin@finstack.com',    role: Role.TENANT_ADMIN },
      { email: 'auditor@finstack.com',  role: Role.AUDITOR },
      { email: 'analyst@finstack.com',  role: Role.ANALYST },
      { email: 'viewer@finstack.com',   role: Role.VIEWER },
    ];
    for (const u of seedUsers) {
      await prisma.user.upsert({
        where:  { email: u.email },
        // tenantId is updated too: users left over from an older seed may point at a stale FinStack tenant.
        update: { role: u.role, password: passwordHash, tenantId: finstackId },
        create: { email: u.email, password: passwordHash, role: u.role, tenantId: finstackId },
      });
      console.log(`   ${u.email} [${u.role}]`);
    }

    // ── Step 3 (--reset only): wipe FinStack's demo data ─────────────────────
    // Users and webhook config are kept. Redis keys are cleared too, otherwise a
    // leftover debounce key from a rehearsal would stop a live detection firing.
    if (RESET) {
      console.log('\n🧹 Resetting FinStack demo data...');
      const [inv, det, evt] = await Promise.all([
        prisma.investigation.deleteMany({ where: { tenantId: finstackId } }),
        prisma.detection.deleteMany({ where: { tenantId: finstackId } }),
        prisma.auditEvent.deleteMany({ where: { tenantId: finstackId } }),
      ]);
      console.log(`   Deleted ${evt.count} events, ${det.count} detections, ${inv.count} investigations.`);

      // Every per-tenant Redis key contains the tenantId (cache, brute-force window, debounce).
      const redis = new Redis(process.env['REDIS_URL'] as string);
      const keys = await redis.keys(`*${finstackId}*`);
      if (keys.length > 0) await redis.del(...keys);
      await redis.quit();
      console.log(`   Cleared ${keys.length} Redis keys.`);
    }

    // ── Step 4: Seed audit events (skip if already present) ────────────────
    const existingCount = await prisma.auditEvent.count({ where: { tenantId: finstackId } });
    if (existingCount > 0) {
      console.log(`\n⏭  Audit events already present (${existingCount} rows) — skipping event seed.`);
      console.log('   Run `npm run db:seed:reset` for fresh demo data.\n');
      return;
    }

    console.log(`\n📝 Seeding ${EVENTS.length} audit events...`);

    // ── Step 5: Build NL representations for all events ────────────────────
    const nlTexts = EVENTS.map(e =>
      nlOf(e.actor, e.action, e.resourceType, e.resourceId, e.sourceService, e.metadata)
    );

    // ── Step 6: Generate embeddings (single batch call) ────────────────────
    let embeddings: number[][] = Array(EVENTS.length).fill([]);

    if (process.env['GOOGLE_API_KEY']) {
      console.log('🔗 Generating embeddings via Gemini (batched)...');
      try {
        const gemini = new GoogleGenerativeAIEmbeddings({
          apiKey: process.env['GOOGLE_API_KEY'],
          model:  process.env['GEMINI_EMBEDDING_MODEL'] ?? 'gemini-embedding-001',
        });
        embeddings = await gemini.embedDocuments(nlTexts);
        console.log('   ✅ Embeddings generated.');
      } catch (err) {
        console.warn('   ⚠️  Embedding generation failed — continuing without embeddings.', err);
      }
    } else {
      console.log('ℹ️  GOOGLE_API_KEY not set — seeding without embeddings (semantic search will be inactive).');
    }

    // ── Step 7: Insert all events ──────────────────────────────────────────
    // resourceId → created row, so detections can reference real event ids.
    const createdByResourceId = new Map<string, { id: string; createdAt: Date }>();

    for (let i = 0; i < EVENTS.length; i++) {
      const e = EVENTS[i]!;
      const ts = daysAgo(e.daysBack, e.hour, e.minute);

      const created = await prisma.auditEvent.create({
        data: {
          tenantId:         finstackId,
          actor:            e.actor,
          action:           e.action,
          resourceType:     e.resourceType,
          resourceId:       e.resourceId,
          sourceService:    e.sourceService,
          metadata:         e.metadata ?? {},
          nlRepresentation: nlTexts[i],
          embedding:        embeddings[i] ?? [],
          createdAt:        ts,
        },
      });
      createdByResourceId.set(e.resourceId, { id: created.id, createdAt: created.createdAt });
    }

    console.log(`\n✅ Seeded ${EVENTS.length} audit events for FinStack.`);

    // ── Step 8: Insert detections linked to their supporting events ────────
    console.log('\n🚨 Seeding detections...');
    for (const d of DETECTIONS) {
      const supporting = d.eventResourceIds.map(rid => {
        const row = createdByResourceId.get(rid);
        if (!row) throw new Error(`Detection ${d.ruleName} references unknown event ${rid}`);
        return row;
      });

      await prisma.detection.create({
        data: {
          tenantId:           finstackId,
          actor:              d.actor,
          ruleName:           d.ruleName,
          ruleDescription:    d.ruleDescription,
          severity:           d.severity,
          status:             d.status,
          metadata:           d.metadata,
          supportingEventIds: supporting.map(s => s.id),
          triggeredAt:        supporting[supporting.length - 1]!.createdAt,
        },
      });
      console.log(`   ${d.severity.padEnd(6)} ${d.ruleName} — ${d.actor} [${d.status}]`);
    }

    console.log('\n🔑 Login credentials:');
    console.log('   Dashboard: admin@finstack.com / password123');
    console.log('   API key:   tk_live_finstack_999\n');

  } finally {
    await prisma.$disconnect();
  }
}

seed().catch((err: unknown) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
