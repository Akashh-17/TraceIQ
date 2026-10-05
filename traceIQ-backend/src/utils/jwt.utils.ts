import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { Role } from '@prisma/client';
import { Permission } from './../types/rbac.types';

// What data do we want to put inside the JWT Payload?
// We keep it extremely small because this travels on EVERY network request.
// DO NOT put passwords, large JSON blocks, or PII here.
export interface JwtPayload {
  userId: string;
  tenantId: string;
  role: Role;
  permissions: Permission[];
}

/**
 * Generates an Access Token with a short lifespan (15 minutes).
 */
export const generateAccessToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, env.accessTokenSecret, {
    expiresIn: '15m',
  });
};

/**
 * Generates a Refresh Token with a long lifespan (30 days).
 * We don't necessarily need the full payload here, just the userId and a random string.
 * But we'll put the userId so we know who it belongs to if needed.
 */
export const generateRefreshToken = (userId: string): string => {
  return jwt.sign({ userId }, env.refreshTokenSecret, {
    expiresIn: '30d',
  });
};

/**
 * Verifies an Access Token and returns its decoded payload.
 * Throws an error if expired or invalid.
 */
export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.accessTokenSecret) as JwtPayload;
};

/**
 * Verifies a Refresh Token and returns its decoded payload.
 * Throws an error if expired or invalid.
 */
export const verifyRefreshToken = (token: string): { userId: string } => {
  return jwt.verify(token, env.refreshTokenSecret) as { userId: string };
};
