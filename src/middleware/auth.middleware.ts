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

// Authentication middleware - verifies JWT token
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Access denied. No token provided.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as {
      employeeId: string;
      username: string;
      emailAddress: string;
      assignedRole: EmployeeRole;
    };

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
