// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import { loginSchema, refreshTokenSchema } from '../validations/auth.validation';
import { loginService, refreshAccessTokenService, logoutService } from '../services/auth.service';
import { AuthRequest } from '../middleware/auth.middleware';

export const login = async (req: Request, res: Response) => {
  try {
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: result.error.flatten(),
      });
    }

    const loginResult = await loginService(result.data);

    res.json({
      message: 'Login successful',
      ...loginResult,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    
    if (error.message === 'Invalid username or password') {
      return res.status(401).json({
        message: error.message,
      });
    }
    
    if (error.message === 'Account is deactivated') {
      return res.status(403).json({
        message: error.message,
      });
    }

    res.status(500).json({
      message: 'Failed to login',
    });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const result = refreshTokenSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: result.error.flatten(),
      });
    }

    const tokens = await refreshAccessTokenService(result.data.refreshToken);

    res.json({
      message: 'Token refreshed successfully',
      ...tokens,
    });
  } catch (error: any) {
    console.error('Refresh token error:', error);
    
    if (error.message === 'Invalid refresh token') {
      return res.status(401).json({
        message: error.message,
      });
    }

    res.status(500).json({
      message: 'Failed to refresh token',
    });
  }
};

export const logout = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.employee) {
      return res.status(401).json({
        message: 'Authentication required',
      });
    }

    await logoutService(req.employee.employeeId);

    res.json({
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      message: 'Failed to logout',
    });
  }
};