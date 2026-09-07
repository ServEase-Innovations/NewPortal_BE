import { Router } from "express";
import {
  createRole,
  deleteRole,
  getRoleById,
  getRoles,
  updateRole,
} from "../controllers/role.controller";

const router = Router();

/**
 * @swagger
 * /roles:
 *   get:
 *     summary: Get all roles
 *     description: Returns a list of all roles with their privileges
 *     tags:
 *       - Roles
 *     responses:
 *       200:
 *         description: Roles fetched successfully
 */
router.get("/", getRoles);

/**
 * @swagger
 * /roles:
 *   post:
 *     summary: Create a new role
 *     description: Creates a new role with specified privileges
 *     tags:
 *       - Roles
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roleName
 *               - displayName
 *             properties:
 *               roleName:
 *                 type: string
 *                 example: manager
 *               displayName:
 *                 type: string
 *                 example: Manager
 *               description:
 *                 type: string
 *                 example: Can manage teams and approve requests
 *               privileges:
 *                 type: object
 *                 example: { "canManageTeams": true, "canApproveLeave": true }
 *               isActive:
 *                 type: boolean
 *                 default: true
 *               isSystemRole:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Role created successfully
 *       409:
 *         description: Role name already exists
 */
router.post("/", createRole);

/**
 * @swagger
 * /roles/{id}:
 *   get:
 *     summary: Get role by ID
 *     description: Returns a single role by ID
 *     tags:
 *       - Roles
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Role found
 *       404:
 *         description: Role not found
 */
router.get("/:id", getRoleById);

/**
 * @swagger
 * /roles/{id}:
 *   put:
 *     summary: Update a role
 *     description: Updates an existing role
 *     tags:
 *       - Roles
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName:
 *                 type: string
 *               description:
 *                 type: string
 *               privileges:
 *                 type: object
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Role updated successfully
 *       404:
 *         description: Role not found
 */
router.put("/:id", updateRole);

/**
 * @swagger
 * /roles/{id}:
 *   delete:
 *     summary: Delete a role
 *     description: Deletes a role (cannot delete system roles)
 *     tags:
 *       - Roles
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Role deleted successfully
 *       403:
 *         description: Cannot delete system role
 *       404:
 *         description: Role not found
 */
router.delete("/:id", deleteRole);

export default router;
