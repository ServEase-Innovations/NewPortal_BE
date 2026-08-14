import { Router } from "express";
import {
  login,
  logout,
  getCurrentUser,
  refreshToken,
} from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import { provideCSRFToken, protectCSRF, includeCSRFInResponse } from "../middleware/csrf.middleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: Authentication APIs
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Employee Login
 *     description: |
 *       Authenticate employee with username and password. 
 *       Sets HTTP-only cookies for access and refresh tokens.
 *       Returns CSRF token if CSRF protection is enabled.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: Employee username
 *                 example: johndoe
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Employee password
 *                 example: SecurePassword123
 *     responses:
 *       200:
 *         description: Login successful
 *         headers:
 *           Set-Cookie:
 *             description: |
 *               HTTP-only cookies containing:
 *               - accessToken: JWT access token (15m lifetime)
 *               - refreshToken: JWT refresh token (7d lifetime)  
 *               - csrfToken: CSRF protection token (if enabled)
 *             schema:
 *               type: string
 *               example: |
 *                 accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=Lax
 *                 refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=Lax  
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Invalid username or password"
 */
router.post("/login", provideCSRFToken, includeCSRFInResponse, login);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Employee Logout
 *     description: |
 *       Logout the currently authenticated employee.
 *       Clears HTTP-only cookies and invalidates tokens.
 *       Requires CSRF token if CSRF protection is enabled.
 *     tags:
 *       - Authentication
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         headers:
 *           Set-Cookie:
 *             description: Clears authentication cookies (accessToken, refreshToken, csrfToken)
 *             schema:
 *               type: string
 *               example: |
 *                 accessToken=; HttpOnly; Secure; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT
 *                 refreshToken=; HttpOnly; Secure; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Logout successful"
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: CSRF token missing or invalid (when CSRF protection is enabled)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/logout", protectCSRF, logout);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh Access Token
 *     description: |
 *       Generate new access token using the refresh token from HTTP-only cookies.
 *       Implements automatic token rotation for enhanced security.
 *       Returns new CSRF token if CSRF protection is enabled.
 *     tags:
 *       - Authentication
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         headers:
 *           Set-Cookie:
 *             description: |
 *               Updates HTTP-only cookies with:
 *               - accessToken: New JWT access token (15m lifetime)
 *               - refreshToken: New JWT refresh token (7d lifetime)
 *               - csrfToken: New CSRF token (if enabled)
 *             schema:
 *               type: string
 *               example: |
 *                 accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=Lax
 *                 refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=Lax
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Token refreshed successfully"
 *                 employee:
 *                   $ref: '#/components/schemas/Employee'
 *                 csrfToken:
 *                   type: string
 *                   description: New CSRF token (only included when CSRF protection is enabled)
 *                   example: "new123csrf456token"
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Invalid or expired refresh token"
 *       403:
 *         description: CSRF token missing or invalid (when CSRF protection is enabled)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/refresh", protectCSRF, provideCSRFToken, includeCSRFInResponse, refreshToken);

/**
 * @swagger
 * /auth/csrf-token:
 *   get:
 *     summary: Get CSRF Token
 *     description: |
 *       Get CSRF token for protected operations. 
 *       Only needed when CSRF protection is enabled (cross-site deployments).
 *       Token is also returned in Set-Cookie header for automatic inclusion.
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: CSRF token provided
 *         headers:
 *           Set-Cookie:
 *             description: Sets csrfToken cookie for automatic inclusion in future requests
 *             schema:
 *               type: string
 *               example: csrfToken=abc123def456; HttpOnly; Secure; SameSite=Lax
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 csrfToken:
 *                   type: string
 *                   nullable: true
 *                   description: CSRF token for X-CSRF-Token header (null if CSRF protection is disabled)
 *                   example: "abc123def456"
 */
router.get("/csrf-token", provideCSRFToken, includeCSRFInResponse, (req, res) => {
  res.json({ csrfToken: req.csrfToken || null });
});

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get Current User
 *     description: |
 *       Get details of the currently authenticated employee.
 *       Uses HTTP-only cookie authentication.
 *     tags:
 *       - Authentication
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Current user details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 employee:
 *                   $ref: '#/components/schemas/Employee'
 *       401:
 *         description: Not authenticated or token expired
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Authentication required"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: "Internal server error"
 */
router.get("/me", authenticate, getCurrentUser);

export default router;