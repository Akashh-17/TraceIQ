import { Role } from '@prisma/client';

// =============================================================================
// PERMISSIONS
// Granular actions that a user can perform in TraceIQ.
// =============================================================================
export enum Permission {
  // Event Permissions
  VIEW_EVENTS = 'VIEW_EVENTS',
  EXPORT_EVENTS = 'EXPORT_EVENTS',

  // Dashboard Permissions
  VIEW_DASHBOARD = 'VIEW_DASHBOARD',

  // Tenant Admin Permissions
  MANAGE_USERS = 'MANAGE_USERS',
  MANAGE_API_KEYS = 'MANAGE_API_KEYS',

  // AI & Analytics
  VIEW_AI_ASSISTANT = 'VIEW_AI_ASSISTANT',
  RUN_AI_INVESTIGATION = 'RUN_AI_INVESTIGATION',

  // System Level
  VIEW_ARCHIVES = 'VIEW_ARCHIVES',
}

// =============================================================================
// ROLE TO PERMISSION MAPPING
// This is the core of our RBAC system. We map Roles to an array of Permissions.
// When a user logs in, we look up their Role here and inject their Permissions
// into their JWT token.
// =============================================================================
export const rolePermissionsMap: Record<Role, Permission[]> = {
  
  // SUPER_ADMIN: Internal TraceIQ employees. Has access to absolutely everything.
  [Role.SUPER_ADMIN]: Object.values(Permission),

  // TENANT_ADMIN: Top-level customer user (e.g. CEO of FinStack).
  [Role.TENANT_ADMIN]: [
    Permission.VIEW_EVENTS,
    Permission.EXPORT_EVENTS,
    Permission.VIEW_DASHBOARD,
    Permission.MANAGE_USERS,
    Permission.MANAGE_API_KEYS,
    Permission.VIEW_AI_ASSISTANT,
    Permission.RUN_AI_INVESTIGATION,
  ],

  // AUDITOR: Compliance officer. Needs read-only access to all data and AI tools,
  // but cannot manage users or API keys.
  [Role.AUDITOR]: [
    Permission.VIEW_EVENTS,
    Permission.EXPORT_EVENTS,
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_AI_ASSISTANT,
    Permission.RUN_AI_INVESTIGATION,
    Permission.VIEW_ARCHIVES,
  ],

  // ANALYST: Standard data analyst. Can view dashboards and basic events,
  // but cannot run expensive AI investigations or export raw data.
  [Role.ANALYST]: [
    Permission.VIEW_EVENTS,
    Permission.VIEW_DASHBOARD,
  ],

  // VIEWER: Least privilege. Can only look at high-level dashboard stats.
  // This is the default role for any newly registered user.
  [Role.VIEWER]: [
    Permission.VIEW_DASHBOARD,
  ],
};
