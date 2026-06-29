// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import prisma from '../prisma';
import { registerEmployeeSchema, loginSchema, refreshTokenSchema } from '../validations/auth.validation';
import { registerService, loginService, refreshAccessTokenService, logoutService } from '../services/auth.service';
import { AuthRequest } from '../middleware/auth.middleware';

export const register = async (req: Request, res: Response) => {
  try {
    const result = registerEmployeeSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: result.error.flatten(),
      });
    }

    const { confirmPassword, ...registerData } = result.data;
    
    const employee = await registerService(registerData);

    res.status(201).json({
      message: 'Employee registered successfully',
      employee: {
        employeeId: employee.employeeId,
        fullName: employee.fullName,
        username: employee.username,
        emailAddress: employee.emailAddress,
        assignedRole: employee.assignedRole,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    
    if (error.code === 'P2002') {
      return res.status(409).json({
        message: 'Username or email already exists',
      });
    }
    
    res.status(500).json({
      message: 'Failed to register employee',
    });
  }
};

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

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.employee) {
      return res.status(401).json({
        message: 'Authentication required',
      });
    }

    const employee = await prisma.employee.findUnique({
      where: { employeeId: req.employee.employeeId },
      select: {
        employeeId: true,
        fullName: true,
        username: true,
        emailAddress: true,
        assignedRole: true,
        assignedDepartment: true,
        baseSalary: true,
        allowances: true,
        deductions: true,
        joinedAt: true,
        lastLogin: true,
        isActive: true,
      },
    });

    if (!employee) {
      return res.status(404).json({
        message: 'Employee not found',
      });
    }

    res.json(employee);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      message: 'Failed to fetch profile',
    });
  }
};