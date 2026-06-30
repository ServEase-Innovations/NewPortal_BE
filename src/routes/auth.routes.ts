import { Router } from "express";
import { login } from "../controllers/auth.controller";

const router = Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Employee Login
 *     description: Login using username and password. Returns a JWT token.
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
 *                 example: roydiy
 *               password:
 *                 type: string
 *                 example: 123456
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid username or password
 */
router.post("/login", login);

export default router;