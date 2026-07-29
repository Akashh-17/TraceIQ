import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { RegisterUserSchema, LoginUserSchema } from '../types/auth.types';
import { AppError } from '../middlewares/errorHandler';

// Configuration for our HttpOnly Refresh Cookie
const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true, // Prevents XSS attacks (JS cannot read it)
  secure: process.env.NODE_ENV === 'production', // Must be true in prod (HTTPS)
  sameSite: 'strict' as const, // Prevents CSRF attacks
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
};

class AuthController {
  
  public async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = RegisterUserSchema.safeParse(req.body);
      
      if (!result.success) {
        res.status(400).json({ 
          success: false, 
          message: 'Validation failed', 
          errors: result.error.issues 
        });
        return;
      }

      const user = await authService.register(result.data);

      res.status(201).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  public async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = LoginUserSchema.safeParse(req.body);
      
      if (!result.success) {
        res.status(400).json({ 
          success: false, 
          message: 'Validation failed', 
          errors: result.error.issues 
        });
        return;
      }

      // We extract User-Agent to track devices (optional but helpful)
      const deviceName = req.headers['user-agent'] || 'Unknown Device';

      const authData = await authService.login(result.data, deviceName);

      // Set the Refresh Token as a secure HttpOnly cookie
      res.cookie(REFRESH_COOKIE_NAME, authData.refreshToken, REFRESH_COOKIE_OPTIONS);

      // Return ONLY the Access Token to the frontend JavaScript
      res.status(200).json({
        success: true,
        data: {
          accessToken: authData.accessToken,
          user: authData.user,
        }
      });
    } catch (error) {
      next(error);
    }
  }

  public async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 1. Read the token from the HttpOnly cookie
      const oldRefreshToken = req.cookies[REFRESH_COOKIE_NAME];

      if (!oldRefreshToken) {
        throw new AppError('No refresh token provided', 401);
      }

      const deviceName = req.headers['user-agent'] || 'Unknown Device';

      // 2. Perform token rotation in the service
      const authData = await authService.refreshToken(oldRefreshToken, deviceName);

      // 3. Set the NEW refresh token in the cookie
      res.cookie(REFRESH_COOKIE_NAME, authData.refreshToken, REFRESH_COOKIE_OPTIONS);

      // 4. Return the NEW access token
      res.status(200).json({
        success: true,
        data: {
          accessToken: authData.accessToken,
        }
      });
    } catch (error) {
      next(error);
    }
  }

  public async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies[REFRESH_COOKIE_NAME];
      
      if (refreshToken) {
        await authService.logout(refreshToken);
      }

      // Clear the cookie regardless of whether the token was valid
      res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS);

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  public async logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // To logout from all devices, we need to know who the user is.
      // They must be authenticated (using their access token) to call this.
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      await authService.logoutAll(req.user.userId);

      // Also clear their current device's cookie
      res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS);

      res.status(200).json({
        success: true,
        message: 'Logged out from all devices successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
