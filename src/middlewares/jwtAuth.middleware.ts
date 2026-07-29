import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.utils';
import { AppError } from './errorHandler';

/**
 * Middleware to protect routes that require human login (e.g., Dashboard).
 * Extracts the JWT from the Authorization header, verifies it, and attaches
 * the user payload to the request.
 */
export const jwtAuthMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // 1. Get the Authorization header
  const authHeader = req.headers.authorization;

  // 2. Check if it exists and follows the "Bearer <token>" format
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Authentication required. Missing or invalid token format.', 401);
  }

  // 3. Extract just the token string
  const token = authHeader.split(' ')[1];

  try {
    // 4. Verify the math (Signature) and expiration
    const payload = verifyAccessToken(token);

    // 5. Attach the decoded payload to the Express request object
    // Now any downstream controller can access req.user.userId!
    req.user = payload;

    // Optional: We can also populate req.tenantId here if we want controllers
    // to seamlessly handle both M2M (API Key) and Human (JWT) requests.
    // req.tenantId = payload.tenantId;

    next();
  } catch (error) {
    // jwt.verify throws specific errors we can catch
    throw new AppError('Invalid or expired token', 401);
  }
};
