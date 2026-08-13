import { Request, Response } from "express";
import { loginService, generateRefreshToken, formatEmployeeData } from "../services/auth.service";

// Cookie configuration
const getCookieOptions = () => ({
  httpOnly: true, // Cannot be accessed by JavaScript (XSS protection)
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'strict' as const, // CSRF protection
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  path: '/',
});

const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
});

export const login = async (
  req: Request,
  res: Response
) => {
  try {
    const { username, password } = req.body;

    const result = await loginService(username, password);

    // Set access token in HTTP-only cookie
    res.cookie('accessToken', result.token, getCookieOptions());
    
    // Set refresh token in HTTP-only cookie (for future refresh flow)
    const refreshToken = generateRefreshToken(result.employee.employeeId);
    res.cookie('refreshToken', refreshToken, getRefreshCookieOptions());

    // Return employee data (NO TOKEN in response body)
    res.status(200).json({
      message: "Login successful",
      employee: result.employee,
    });
  } catch (error: any) {
    res.status(401).json({
      message: error.message,
    });
  }
};

export const logout = async (
  req: Request,
  res: Response
) => {
  // Clear cookies
  res.clearCookie('accessToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/' });
  
  res.status(200).json({
    message: "Logout successful",
  });
};

export const getCurrentUser = async (
  req: Request,
  res: Response
) => {
  try {
    // Employee JWT payload is attached to req by auth middleware
    const employeeFromToken = (req as any).employee;
    
    console.log('[getCurrentUser] Token payload:', employeeFromToken);
    console.log('[getCurrentUser] Cookies:', req.cookies);
    
    if (!employeeFromToken) {
      return res.status(401).json({
        message: "Not authenticated",
      });
    }

    // Fetch full employee data from database
    const prisma = require("../prisma").default;
    const employee = await prisma.employee.findUnique({
      where: { employeeId: BigInt(employeeFromToken.employeeId) },
    });

    if (!employee) {
      console.log('[getCurrentUser] Employee not found in DB:', employeeFromToken.employeeId);
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    console.log('[getCurrentUser] Returning employee:', employee.fullName);

    // Use shared formatter for consistent response format
    res.status(200).json(formatEmployeeData(employee));
  } catch (error: any) {
    console.error('[getCurrentUser] Error:', error);
    res.status(500).json({
      message: error.message,
    });
  }
};