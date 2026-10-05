// src/middlewares/errorHandler.ts
//
// Two things live here:
//   1. AppError — a custom error class with HTTP awareness
//   2. globalErrorHandler — Express catches all errors and formats them here
//
// HOW ERRORS FLOW:
//   Something goes wrong anywhere → throw new AppError(...) or next(err)
//   → Express skips all normal handlers → calls globalErrorHandler
//
// req  = what came in  (method, url, body...)
// res  = what goes out (status, json...)
// next = pass control to the next middleware (or to error handler if you pass an error)

import { Request, Response, NextFunction } from "express";

// AppError extends the built-in JS Error (which has: message, name, stack).
// We add two things the built-in doesn't have:
//   statusCode   → which HTTP code to send back (400, 404, 500...)
//   isOperational → true = expected error (bad input, not found)
//                   false = unexpected bug (DB crashed, null pointer)
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message); // initialises the parent Error with the message
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    // Required in TypeScript when extending built-in classes like Error.
    // Without this, `instanceof AppError` checks would fail at runtime.
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

// Catches routes that don't exist. Runs when no route above matched.
export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

import { logger } from "../config/logger";

// Express identifies error handlers by the 4-parameter signature (err, req, res, next).
// This runs whenever next(err) is called anywhere, or when a route throws.
export const globalErrorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const isOperational = err instanceof AppError ? err.isOperational : false;

  // Log only unexpected errors (bugs). Operational errors (bad input etc.) are noise.
  if (!isOperational) {
    logger.error(
      {
        err: {
          message: err.message,
          stack: err.stack,
        },
        method: req.method,
        url: req.originalUrl,
      },
      "UNEXPECTED ERROR"
    );
  }

  res.status(statusCode).json({
    success: false,
    // For 500s in production, we hide the actual error message to prevent leaking internals.
    // For operational errors (400, 404), the message is safe to show.
    message: (!isOperational && process.env["NODE_ENV"] === "production") 
      ? "An unexpected error occurred." 
      : err.message,
    // Stack trace only in development — never expose internals in production
    ...(process.env["NODE_ENV"] === "development" && { stack: err.stack }),
  });
};

/*
HTTP status code quick reference:
  400 → Bad Request     (invalid input)
  401 → Unauthorized    (not logged in / no API key)
  403 → Forbidden       (logged in but not allowed)
  404 → Not Found
  409 → Conflict        (duplicate resource)
  500 → Internal Error  (our bug)
*/