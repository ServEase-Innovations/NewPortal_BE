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
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: roydiy
 *               password:
 *                 type: string
 *                 example: Diya@2003
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post("/login", provideCSRFToken, includeCSRFInResponse, login);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Employee Logout
 *     description: Logout employee
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post("/logout", protectCSRF, logout);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh Access Token
 *     description: Generate new access token using refresh token
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post("/refresh", protectCSRF, provideCSRFToken, includeCSRFInResponse, refreshToken);

/**
 * @swagger
 * /auth/csrf-token:
 *   get:
 *     summary: Get CSRF Token
 *     description: Get CSRF token for protected operations (only needed when CSRF protection is enabled)
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: CSRF token provided
 */
router.get("/csrf-token", provideCSRFToken, includeCSRFInResponse, (req, res) => {
  res.json({ csrfToken: req.csrfToken || null });
});

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user
 *     description: Get currently authenticated user details
 *     tags:
 *       - Authentication
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User details
 *       401:
 *         description: Not authenticated
 */
router.get("/me", authenticate, getCurrentUser);

export default router;