// src/middlewares/auth.middleware.ts
//
// Authentication Middleware (The Bouncer)
// =======================================
// Why this file exists:
// In the Controller -> Service -> Repository flow, we need to guarantee that requests are legitimate 
// BEFORE they even reach the Controller. The Controller shouldn't have to worry about validating API keys.
//
// Separation of Concerns:
// This middleware is the only file that knows how to read the `Authorization` header.
// If valid, it attaches the tenant to the request (`req.tenant`), passing the baton safely to the Controller.
//
// Machine-to-Machine (M2M) Auth:
// We use API Keys (not JWTs) because backend services don't have human users to "log in" and manage expiring sessions.

import { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler";
import { tenantRepository } from "../models/tenant.repository";
import { verifyAccessToken } from "../utils/jwt.utils";

export const authMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Get the Authorization header
    // Expected format: "Bearer tk_live_abc123"
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError("Missing Authorization header", 401);
    }

    if (!authHeader.startsWith("Bearer ")) {
      throw new AppError("Invalid Authorization format. Expected: Bearer <api_key>", 401);
    }

    // 2. Extract the key (remove "Bearer " from the start)
    const token = authHeader.split(" ")[1];

    if (!token) {
      throw new AppError("Missing token", 401);
    }

    let tenant;

    // 3. Determine if token is a JWT or an API Key
    if (token.split('.').length === 3) {
      // It's a JWT
      try {
        const payload = verifyAccessToken(token);
        // Ensure user is attached if downstream expects it, and resolve tenant
        req.user = payload;
        tenant = await tenantRepository.findById(payload.tenantId);
      } catch (err) {
        throw new AppError("Invalid or expired JWT token", 401);
      }
    } else {
      // It's an API Key
      tenant = await tenantRepository.findByApiKey(token);
    }

    if (!tenant) {
      throw new AppError("Invalid credentials or tenant not found", 401);
    }

    // 4. Attach the verified tenant to the request object
    // This makes it available to the Controller down the line.
    req.tenant = tenant;

    // 5. Pass the baton to the next middleware or controller
    next();
  } catch (err) {
    // Pass any errors to the global error handler
    next(err);
  }
};
