import { Request, Response, NextFunction } from 'express';
import * as crypto from 'node:crypto';
import { parseJWTExpiryToMs } from '../utils/time.utils';

declare global {
  namespace Express {
    interface Request {
      csrfToken?: string;
    }
  }
}

// Generate a cryptographically secure CSRF token
export const generateCSRFToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Verify CSRF token from request
const verifyCSRFToken = (sessionToken: string, requestToken: string): boolean => {
  if (!sessionToken || !requestToken) {
    return false;
  }
  
  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(sessionToken, 'hex'),
    Buffer.from(requestToken, 'hex')
  );
};

// Check if CSRF protection is needed based on sameSite policy
const isCSRFProtectionNeeded = (): boolean => {
  const policy = process.env.COOKIE_SAMESITE_POLICY;
  
  // Always protect if sameSite is 'none'
  if (policy === 'none') {
    return true;
  }
  
  // Optional protection for 'lax' in production (defense in depth)
  if (policy === 'lax' && process.env.NODE_ENV === 'production') {
    return process.env.ENABLE_CSRF_PROTECTION === 'true';
  }
  
  // Auto-detect: if no policy set and we detect cross-site deployment
  if (!policy) {
    const frontendUrl = process.env.FRONTEND_URL || '';
    const backendUrl = process.env.BACKEND_URL || '';
    
    if (frontendUrl && backendUrl) {
      try {
        const frontendDomain = new URL(frontendUrl).hostname;
        const backendDomain = new URL(backendUrl).hostname;
        
        // If cross-site, enable CSRF protection
        const isCrossSite = !frontendDomain.endsWith(backendDomain.split('.').slice(-2).join('.')) &&
                           !backendDomain.endsWith(frontendDomain.split('.').slice(-2).join('.'));
        
        return isCrossSite;
      } catch {
        return false;
      }
    }
  }
  
  return false;
};

// CSRF token generation endpoint middleware
export const provideCSRFToken = (req: Request, res: Response, next: NextFunction) => {
  if (!isCSRFProtectionNeeded()) {
    return next();
  }
  
  // Generate and store CSRF token in session/cookie
  const csrfToken = generateCSRFToken();
  req.csrfToken = csrfToken;
  
  // Set CSRF token in a separate cookie (not httpOnly so frontend can read it)
  res.cookie('csrfToken', csrfToken, {
    httpOnly: false, // Frontend needs to read this
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict', // CSRF token should always be strict
    maxAge: parseJWTExpiryToMs(process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || "15m"), // Match access token lifetime
    path: '/',
  });
  
  next();
};

// CSRF protection middleware for state-changing operations
export const protectCSRF = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF protection if not needed
  if (!isCSRFProtectionNeeded()) {
    return next();
  }
  
  // Only protect state-changing methods
  const protectedMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!protectedMethods.includes(req.method)) {
    return next();
  }
  
  // Get CSRF token from cookie (server-side reference)
  const sessionToken = req.cookies?.csrfToken;
  
  // Get CSRF token from request (client must provide this)
  const requestToken = req.headers['x-csrf-token'] as string || req.body?._csrf;
  
  if (!verifyCSRFToken(sessionToken, requestToken)) {
    return res.status(403).json({
      message: 'CSRF token validation failed',
      error: 'Invalid or missing CSRF token'
    });
  }
  
  next();
};

// Middleware to add CSRF token to response for API clients
export const includeCSRFInResponse = (req: Request, res: Response, next: NextFunction) => {
  if (!isCSRFProtectionNeeded()) {
    return next();
  }
  
  // Store original json method
  const originalJson = res.json;
  
  // Override json method to include CSRF token
  res.json = function(obj: any) {
    if (req.csrfToken && obj && typeof obj === 'object') {
      obj.csrfToken = req.csrfToken;
    }
    return originalJson.call(this, obj);
  };
  
  next();
};