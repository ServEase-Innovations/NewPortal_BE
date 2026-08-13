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
    ) as {
      employeeId: string;
      username: string;
      emailAddress: string;
      assignedRole: EmployeeRole;
      type?: string;
    };

    // Reject refresh tokens - they should not be used for API access
    if (decoded.type === 'refresh') {
      return res.status(401).json({
        message: "Invalid token type. Refresh tokens cannot be used for API access.",
      });
    }

    (req as AuthRequest).employee = decoded;
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
