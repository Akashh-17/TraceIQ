// src/types/event.types.ts
//
// Two exports:
//   CreateEventSchema — Zod schema that validates incoming API request bodies
//   CreateEventDto    — TypeScript type inferred FROM that schema (no duplication)
//
// ZOD = validation + TypeScript type in one.
// You write the schema once. Zod validates at runtime AND gives you the type.
// You never write a separate interface for the same shape.

import { z } from 'zod/v4';

export const CreateEventSchema = z.object({
  // Valid: "admin@company.com" | Invalid: "admin", "admin@"
  actor: z
    .string({ error: 'actor is required' })
    .email('actor must be a valid email address'),

  // Must be UPPERCASE_WITH_UNDERSCORES
  // Valid: TRANSACTION_APPROVED, LOGIN_FAILED | Invalid: loginFailed, "login failed"
  action: z
    .string({ error: 'action is required' })
    .regex(
      /^[A-Z][A-Z0-9_]*$/,
      'action must be uppercase letters, numbers, and underscores only (e.g. TRANSACTION_APPROVED)'
    ),

  resource_type: z
    .string({ error: 'resource_type is required' })
    .min(1, 'resource_type cannot be empty'),

  resource_id: z
    .string({ error: 'resource_id is required' })
    .min(1, 'resource_id cannot be empty'),

  // Optional freeform JSON — e.g. { "amount": 5000, "currency": "INR" }
  metadata: z.record(z.string(), z.unknown()).optional(),

  // Which internal service is sending this event?
  // Valid: AUTH_SERVICE, PAYMENTS_SERVICE | Invalid: authService, "auth service"
  source_service: z
    .string({ error: 'source_service is required' })
    .regex(
      /^[A-Z][A-Z0-9_]*$/,
      'source_service must be uppercase letters, numbers, and underscores only (e.g. AUTH_SERVICE)'
    ),
});

// z.infer extracts the TypeScript type FROM the schema.
// Result is equivalent to writing this interface manually — but we don't have to:
//   { actor: string; action: string; resource_type: string;
//     resource_id: string; metadata?: Record<string,unknown>; source_service: string }
export type CreateEventDto = z.infer<typeof CreateEventSchema>;