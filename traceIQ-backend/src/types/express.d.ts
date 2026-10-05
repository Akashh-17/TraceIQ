// src/types/express.d.ts
//
// Express Type Augmentation (The Bridge)
// ======================================
// Why this file exists:
// TypeScript is strict. By default, Express's `Request` object does NOT have a `tenant` property.
// If our authMiddleware tries to do `req.tenant = tenant`, TypeScript will throw a compilation error.
//
// This file uses "Declaration Merging" to inject our custom properties into the global Express types.
// It bridges the gap between our business logic (Tenants) and the framework (Express).

import { Tenant } from "@prisma/client";
import { JwtPayload } from "../utils/jwt.utils";

declare global {
    namespace Express {
        export interface Request {
            tenant: Tenant;
            user?: JwtPayload;
        }
    }
}