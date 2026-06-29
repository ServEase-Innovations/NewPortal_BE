import { Router } from 'express';
import { register, login, refreshToken, logout, getProfile } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new employee
 *     description: Creates a new employee with auto-generated username and hashed password
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - emailAddress
 *               - assignedRole
 *               - assignedDepartment
 *               - password
 *               - confirmPassword
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: John Doe
 *               emailAddress:
 *                 type: string
 *                 example: john.doe@company.com
 *               assignedRole:
 *                 type: string
 *                 enum: [SuperAdmin, Manager, Developer, Marketing, CustomStaff]
 *                 example: Developer
 *               assignedDepartment:
 *                 type: string
 *                 example: Engineering
 *               baseSalary:
 *                 type: number
 *                 example: 60000
 *               allowances:
 *                 type: number
 *                 example: 5000
 *               deductions:
 *                 type: number
 *                 example: 1000
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: Password123!
 *               confirmPassword:
 *                 type: string
 *                 minLength: 8
 *                 example: Password123!
 *     responses:
 *       201:
 *         description: Employee registered successfully
 *       400:
 *         description: Validation failed
 *       500:
 *         description: Server error
 */
router.post('/register', register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login employee
 *     description: Authenticates employee using username and password
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
 *                 example: doejoh
 *               password:
 *                 type: string
 *                 example: Password123!
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account deactivated
 *       500:
 *         description: Server error
 */
router.post('/login', login);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     description: Get new access token using refresh token
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid refresh token
 *       500:
 *         description: Server error
 */
router.post('/refresh-token', refreshToken);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout employee
 *     description: Invalidates the refresh token
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.post('/logout', authenticate, logout);

/**
 * @swagger
 * /auth/profile:
 *   get:
 *     summary: Get employee profile
 *     description: Get current employee's profile information
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile fetched successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Employee not found
 *       500:
 *         description: Server error
 */
router.get('/profile', authenticate, getProfile);

export default router;