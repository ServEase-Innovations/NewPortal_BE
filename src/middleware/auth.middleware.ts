// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/auth.utils';

export interface AuthRequest extends Request {
  employee?: {
    employeeId: string;
    role: string;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      message: 'Authentication required',
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyAccessToken(token);

  if (!decoded) {
    res.status(401).json({
      message: 'Invalid or expired token',
    });
    return;
  }

  req.employee = {
    employeeId: decoded.employeeId,
    role: decoded.role,
  };

  next();
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.employee) {
      res.status(401).json({
        message: 'Authentication required',
      });
      return;
    }

    if (!roles.includes(req.employee.role)) {
      res.status(403).json({
        message: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
};