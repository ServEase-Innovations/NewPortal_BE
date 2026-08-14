import { Request, Response } from "express";
import { loginService, generateRefreshToken, formatEmployeeData, refreshTokenService } from "../services/auth.service";
import { AuthRequest } from "../middleware/auth.middleware";
import { parseJWTExpiryToMs } from "../utils/time.utils";
import prisma from "../prisma";

// Cookie configuration with environment-aware sameSite policy
const getSameSitePolicy = (): 'strict' | 'lax' | 'none' => {
  const policy = process.env.COOKIE_SAMESITE_POLICY;
  
  // If explicitly set, use that value
  if (policy === 'strict' || policy === 'lax' || policy === 'none') {
    return policy;
  }
  
  // Auto-detect based on environment
  if (process.env.NODE_ENV === 'production') {
    // In production, check if we need cross-site cookies
    const frontendUrl = process.env.FRONTEND_URL || '';
    const backendUrl = process.env.BACKEND_URL || '';
    
    // If URLs are provided and are cross-site, use 'none'
    if (frontendUrl && backendUrl) {
      try {
        const frontendDomain = new URL(frontendUrl).hostname;
        const backendDomain = new URL(backendUrl).hostname;
        
        // Check if they're different registrable domains
        const isCrossSite = !frontendDomain.endsWith(backendDomain.split('.').slice(-2).join('.')) &&
                           !backendDomain.endsWith(frontendDomain.split('.').slice(-2).join('.'));
        
        return isCrossSite ? 'none' : 'lax';
      } catch {
        // If URL parsing fails, default to 'lax'
        return 'lax';
      }
    }
    
    // Default to 'lax' for production if no URLs provided
    return 'lax';
  }
  
  // Development default - 'lax' for cross-origin localhost requests
  return 'lax';
};

const getCookieOptions = () => {
  const sameSite = getSameSitePolicy();
  const accessTokenExpiry = process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || "15m";
  
  return {
    httpOnly: true, // Cannot be accessed by JavaScript (XSS protection)
    secure: process.env.NODE_ENV === 'production' || sameSite === 'none', // HTTPS required for sameSite=none
    sameSite,
    maxAge: parseJWTExpiryToMs(accessTokenExpiry), // Match JWT token lifetime
    path: '/',
  };
};

const getRefreshCookieOptions = () => {
  const sameSite = getSameSitePolicy();
  
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || sameSite === 'none', // HTTPS required for sameSite=none
    sameSite,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };
};

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

    // Prepare response data
    const responseData: any = {
      message: "Login successful",
      employee: result.employee,
    };

    // Add CSRF token to response if CSRF protection is enabled
    if (req.csrfToken) {
      responseData.csrfToken = req.csrfToken;
    }

    // Return employee data (NO TOKEN in response body)
    res.status(200).json(responseData);
  } catch (error: any) {
    // Log the actual error for debugging
    console.error('[Login] Error:', error);
    
    // Only return safe, expected authentication errors
    // For unexpected errors, return generic message to prevent information leakage
    const isKnownAuthError = error.message && (
      error.message.includes('Invalid credentials') ||
      error.message.includes('Employee not found') ||
      error.message.includes('Account is inactive')
    );
    
    if (isKnownAuthError) {
      res.status(401).json({
        message: error.message,
      });
    } else {
      // Generic message for unexpected errors (DB failures, etc.)
      res.status(500).json({
        message: "Authentication service temporarily unavailable",
      });
    }
  }
};

export const logout = async (
  req: Request,
  res: Response
) => {
  // Clear cookies
  res.clearCookie('accessToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/' });
  res.clearCookie('csrfToken', { path: '/' }); // Clear CSRF token on logout
  
  res.status(200).json({
    message: "Logout successful",
  });
};

export const refreshToken = async (
  req: Request,
  res: Response
) => {
  try {
    // Get refresh token from cookie
    const refreshToken = req.cookies?.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({
        message: "Refresh token not found",
      });
    }

    // Refresh tokens and get new tokens
    const result = await refreshTokenService(refreshToken);

    // Set new access token cookie
    res.cookie('accessToken', result.accessToken, getCookieOptions());
    
    // Set new refresh token cookie (token rotation)
    res.cookie('refreshToken', result.refreshToken, getRefreshCookieOptions());

    // Return success with employee data
    res.status(200).json({
      message: "Token refreshed successfully",
      employee: result.employee,
    });
  } catch (error: any) {
    // Log the actual error for server-side debugging
    console.error('[RefreshToken] Error:', error);
    
    // Clear invalid refresh token
    res.clearCookie('refreshToken', { path: '/' });
    
    // Don't expose internal error details
    res.status(401).json({
      message: "Invalid or expired refresh token",
    });
  }
};

export const getCurrentUser = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    // Employee JWT payload is attached to req by auth middleware
    const employeeFromToken = req.employee;
    
    if (!employeeFromToken) {
      return res.status(401).json({
        message: "Not authenticated",
      });
    }

    // Validate and safely convert employeeId
    let employeeId: bigint;
    try {
      // Validate that employeeId is a numeric string
      if (!/^\d+$/.test(employeeFromToken.employeeId)) {
        return res.status(401).json({
          message: "Invalid employee ID format in token",
        });
      }
      
      employeeId = BigInt(employeeFromToken.employeeId);
    } catch (error) {
      return res.status(401).json({
        message: "Invalid employee ID in token",
      });
    }

    // Fetch full employee data from database
    const employee = await prisma.employee.findUnique({
      where: { employeeId: employeeId },
    });

    if (!employee) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    // Use shared formatter for consistent response format
    res.status(200).json(formatEmployeeData(employee));
  } catch (error: any) {
    // Log the actual error for server-side debugging
    console.error('[getCurrentUser] Error:', error);
    
    // Don't expose internal error details (could be DB errors, etc.)
    res.status(500).json({
      message: "Internal server error",
    });
  }
};