// src/routes/dashboard.route.ts
//
// Route definition for /api/v1/dashboard
// Mounted in app.ts at '/api/v1/dashboard'.
//
// WHY A SEPARATE ROUTE FILE?
// ==========================
// Dashboard endpoints have different characteristics than event endpoints:
//   - They return aggregated summaries, not individual records
//   - They are always cached (not filtered dynamically)
//   - They will grow to include charts, trends, activity heatmaps in future phases
//
// Separating routes by domain keeps app.ts clean and the route files focused.
// When Phase 9 adds more dashboard widgets, they go here, not in events.route.ts.
//
// All dashboard routes require authMiddleware — dashboards are tenant-specific.
// The tenant's API key determines WHICH tenant's dashboard data is returned.

import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { jwtAuthMiddleware } from '../middlewares/jwtAuth.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';
import { Permission } from '../types/rbac.types';

const router = Router();

// GET /api/v1/dashboard/stats
// Returns: totalEvents, eventsToday, failedLoginsToday, topActors, topActions
// Cached in Redis for 60 seconds per tenant (Cache-Aside pattern from Phase 6)
router.get(
  '/stats', 
  jwtAuthMiddleware, 
  requirePermission(Permission.VIEW_DASHBOARD), 
  dashboardController.getDashboardStats
);

// GET /api/v1/dashboard/trends
router.get(
  '/trends',
  jwtAuthMiddleware,
  requirePermission(Permission.VIEW_DASHBOARD),
  dashboardController.getTrends
);

// GET /api/v1/dashboard/detection-trend
router.get(
  '/detection-trend',
  jwtAuthMiddleware,
  requirePermission(Permission.VIEW_DASHBOARD),
  dashboardController.getDetectionTrend
);

export default router;
