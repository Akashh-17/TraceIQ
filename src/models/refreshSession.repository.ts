import { prisma } from '../config/prisma';
import { RefreshSession } from '@prisma/client';

class RefreshSessionRepository {
  /**
   * Creates a new refresh session in the database.
   */
  async createSession(
    userId: string,
    hashedToken: string,
    expiresAt: Date,
    deviceName?: string
  ): Promise<RefreshSession> {
    return prisma.refreshSession.create({
      data: {
        userId,
        hashedToken,
        expiresAt,
        deviceName,
      },
    });
  }

  /**
   * Finds a session by its ID.
   */
  async findById(sessionId: string): Promise<RefreshSession | null> {
    return prisma.refreshSession.findUnique({
      where: { id: sessionId },
    });
  }

  /**
   * Finds a session by its hashed token.
   */
  async findByHashedToken(hashedToken: string): Promise<RefreshSession | null> {
    return prisma.refreshSession.findUnique({
      where: { hashedToken },
    });
  }

  /**
   * Replaces an old token with a new token (Token Rotation).
   */
  async updateSessionToken(
    sessionId: string,
    newHashedToken: string,
    newExpiresAt: Date
  ): Promise<RefreshSession> {
    return prisma.refreshSession.update({
      where: { id: sessionId },
      data: {
        hashedToken: newHashedToken,
        expiresAt: newExpiresAt,
        lastUsedAt: new Date(),
      },
    });
  }

  /**
   * Marks a single session as revoked.
   */
  async revokeSession(sessionId: string): Promise<void> {
    await prisma.refreshSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Revokes all active sessions for a specific user (Logout from all devices).
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    await prisma.refreshSession.updateMany({
      where: { 
        userId,
        revokedAt: null, // Only revoke currently active ones
      },
      data: { revokedAt: new Date() },
    });
  }
}

export const refreshSessionRepository = new RefreshSessionRepository();
