import { AppError } from '../middlewares/errorHandler';
import { userRepository } from '../models/user.repository';
import { refreshSessionRepository } from '../models/refreshSession.repository';
import { hashPassword, verifyPassword } from '../utils/password.utils';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.utils';
import { RegisterUserDto, LoginUserDto } from '../types/auth.types';
import { rolePermissionsMap } from '../types/rbac.types';
import crypto from 'crypto';

/**
 * Hashes a refresh token for safe database storage.
 * We use SHA-256 for refresh tokens because it's fast. 
 * bcrypt is too slow for verifying tokens on every refresh request.
 */
const hashRefreshToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

class AuthService {
  /**
   * Registers a new user.
   */
  async register(data: RegisterUserDto) {
    const existingUser = await userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new AppError('Email already in use', 400);
    }

    const passwordHash = await hashPassword(data.password);
    const newUser = await userRepository.create(data.email, passwordHash, data.tenantId);

    return {
      id: newUser.id,
      email: newUser.email,
      tenantId: newUser.tenantId,
      role: newUser.role,
    };
  }

  /**
   * Authenticates a user and creates a new session.
   */
  async login(data: LoginUserDto, deviceName?: string) {
    const user = await userRepository.findByEmail(data.email);
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isMatch = await verifyPassword(data.password, user.password);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    const userPermissions = rolePermissionsMap[user.role] || [];

    // Generate Access Token (15m)
    const accessToken = generateAccessToken({
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      permissions: userPermissions,
    });

    // Generate Refresh Token (30d)
    const refreshToken = generateRefreshToken(user.id);
    const hashedToken = hashRefreshToken(refreshToken);

    // Save Refresh Session to Database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

    await refreshSessionRepository.createSession(
      user.id,
      hashedToken,
      expiresAt,
      deviceName
    );

    return {
      accessToken,
      refreshToken, // Controller will put this in an HttpOnly cookie
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  /**
   * Refreshes an access token using a valid refresh token (Token Rotation).
   */
  async refreshToken(oldRefreshToken: string, deviceName?: string) {
    // 1. Verify token mathematically
    let payload;
    try {
      payload = verifyRefreshToken(oldRefreshToken);
    } catch (error) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    // 2. Find the token in the database
    const hashedOldToken = hashRefreshToken(oldRefreshToken);
    const session = await refreshSessionRepository.findByHashedToken(hashedOldToken);

    if (!session) {
      throw new AppError('Refresh session not found', 401);
    }

    // 3. Check if revoked
    if (session.revokedAt) {
      throw new AppError('Refresh session has been revoked', 401);
    }

    // 4. Check if expired in DB (just to be safe, though jwt.verify should catch this)
    if (session.expiresAt < new Date()) {
      throw new AppError('Refresh session expired', 401);
    }

    // 5. Fetch user to generate new Access Token
    const user = await userRepository.findById(payload.userId);
    if (!user) {
      throw new AppError('User not found', 401);
    }

    const userPermissions = rolePermissionsMap[user.role] || [];

    // 6. Generate NEW Access Token
    const newAccessToken = generateAccessToken({
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      permissions: userPermissions,
    });

    // 7. Generate NEW Refresh Token (Token Rotation)
    const newRefreshToken = generateRefreshToken(user.id);
    const hashedNewToken = hashRefreshToken(newRefreshToken);

    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 30);

    // 8. Update session in DB
    await refreshSessionRepository.updateSessionToken(session.id, hashedNewToken, newExpiresAt);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken, // Will be set in new cookie
    };
  }

  /**
   * Revokes a specific refresh session (Logout).
   */
  async logout(refreshToken: string) {
    const hashedToken = hashRefreshToken(refreshToken);
    const session = await refreshSessionRepository.findByHashedToken(hashedToken);
    
    if (session) {
      await refreshSessionRepository.revokeSession(session.id);
    }
  }

  /**
   * Revokes all refresh sessions for a user.
   */
  async logoutAll(userId: string) {
    await refreshSessionRepository.revokeAllUserSessions(userId);
  }
}

export const authService = new AuthService();
