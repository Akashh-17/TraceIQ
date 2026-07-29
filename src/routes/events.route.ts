// src/routes/events.route.ts
//
// Route definition for /api/v1/events
// Mounted in app.ts — paths here are RELATIVE to the mount point.
// So `router.get('/recent')` here = GET /api/v1/events/recent globally.
//
// All routes require authMiddleware — the Bouncer validates API key,
// resolves the tenant, and attaches it to req.tenant before any controller runs.
//
// ⚠️ ROUTE ORDERING IS CRITICAL IN EXPRESS ⚠️
// Express matches routes top-down and stops at the FIRST match.
// The route /:id will match ANY string in that position — including 'recent' and 'stats'.
//
// WRONG ORDER (breaks /recent and /stats):
//   router.get('/:id',    handler)   ← 'recent' matches this! /recent never reached
//   router.get('/recent', handler)   ← UNREACHABLE
//
// CORRECT ORDER (specific before generic):
//   router.get('/recent', handler)   ← matches exactly /recent
//   router.get('/stats',  handler)   ← matches exactly /stats
//   router.get('/',       handler)   ← matches exactly / (with query params)
//   router.get('/:id',    handler)   ← only matches if nothing above matched
//
// Rule: Always register SPECIFIC routes before PARAMETERISED routes.
// This is one of the most common Express beginner bugs.

import { Router } from 'express';
import { eventsController } from '../controllers/events.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// ── Write ──────────────────────────────────────────────────────────────────────
router.post('/', authMiddleware, eventsController.ingestEvent);

// ── Read: specific fixed paths FIRST ──────────────────────────────────────────
// Phase 6: Cache-Aside — Controller checks Redis first, falls back to PostgreSQL.
router.get('/recent', authMiddleware, eventsController.getRecentEvents);
router.get('/stats',  authMiddleware, eventsController.getStats);

// ── Read: Phase 7 Query Engine ─────────────────────────────────────────────────
// GET / with optional query params: ?actor=&action=&cursor=&limit=&sort=
// This MUST come AFTER /recent and /stats (which are also GET routes)
// so those fixed-path routes are matched first.
router.get('/',   authMiddleware, eventsController.queryEvents);

// GET /:id/related — Must come before or alongside /:id
router.get('/:id/related', authMiddleware, eventsController.getRelatedEvents);

// GET /:id — MUST be LAST among GET routes.
// Any value (UUID, 'test', 'abc') will match /:id.
// Placing it last ensures '/recent', '/stats', '/' all match before this.
router.get('/:id', authMiddleware, eventsController.getEventById);

// Future routes (uncomment as phases are built):
// router.get('/export',         authMiddleware, eventsController.exportEvents);     // Phase 9
// router.post('/query/natural', authMiddleware, eventsController.naturalQuery);     // Phase 10

export default router;