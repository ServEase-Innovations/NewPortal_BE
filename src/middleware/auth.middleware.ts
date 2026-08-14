import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { EmployeeRole } from "@prisma/client";

// Extend Request interface to include employee
export interface AuthRequest extends Request {
  employee?: {
    employeeId: string;
    username: string;
    emailAddress: string;
    assignedRole: EmployeeRole;
  };
}

// Authentication middleware - verifies JWT token from HTTP-only cookie
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Try to get token from cookie first (primary method)
  let token = req.cookies?.accessToken;

  // Fallback: Check Authorization header for backward compatibility during migration
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
  }

  if (!token) {
    return res.status(401).json({
      message: "Access denied. No token provided.",
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as any; // Start with any, then validate

    // Validate JWT payload structure and types
    if (!decoded || typeof decoded !== 'object') {
      return res.status(401).json({
        message: "Invalid token payload structure",
      });
    }

    // Validate required fields and types
    if (!decoded.employeeId || typeof decoded.employeeId !== 'string') {
      return res.status(401).json({
        message: "Invalid or missing employee ID in token",
      });
    }

    if (!decoded.username || typeof decoded.username !== 'string') {
      return res.status(401).json({
        message: "Invalid or missing username in token",
      });
    }

    if (!decoded.emailAddress || typeof decoded.emailAddress !== 'string') {
      return res.status(401).json({
        message: "Invalid or missing email address in token",
      });
    }

    if (!decoded.assignedRole || typeof decoded.assignedRole !== 'string') {
      return res.status(401).json({
        message: "Invalid or missing role in token",
      });
    }

    // Validate employee ID format (should be numeric string for BigInt conversion)
    if (!/^\d+$/.test(decoded.employeeId)) {
      return res.status(401).json({
        message: "Invalid employee ID format in token",
      });
    }

    // Only accept access tokens for API authentication
    if (decoded.type !== 'access') {
      return res.status(401).json({
        message: "Invalid token type. Only access tokens are allowed for API access.",
      });
    }

    // Build clean employee object with validated fields only
    const validatedEmployee = {
      employeeId: decoded.employeeId,
      username: decoded.username,
      emailAddress: decoded.emailAddress,
      assignedRole: decoded.assignedRole as EmployeeRole
    };

    (req as AuthRequest).employee = validatedEmployee;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

// Authorization middleware - checks user roles
export const authorize = (...allowedRoles: EmployeeRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    
    if (!authReq.employee) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    if (!allowedRoles.includes(authReq.employee.assignedRole)) {
      return res.status(403).json({
        message: "Insufficient permissions. Required roles: " + allowedRoles.join(", "),
      });
    }

    next();
  };
};

// Legacy export for backward compatibility
export const authMiddleware = authenticate;
