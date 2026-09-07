// src/routes/department.routes.ts
import { Router } from 'express';
import {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '../controllers/department.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * /departments:
 *   get:
 *     summary: Get all departments
 *     description: Returns a list of all active departments with employee counts
 *     tags:
 *       - Departments
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Departments fetched successfully
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.get('/', authenticate, getDepartments);

/**
 * @swagger
 * /departments/{id}:
 *   get:
 *     summary: Get department by ID
 *     description: Returns a single department with details
 *     tags:
 *       - Departments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Department found
 *       404:
 *         description: Department not found
 *       500:
 *         description: Server error
 */
router.get('/:id', authenticate, getDepartmentById);

/**
 * @swagger
 * /departments:
 *   post:
 *     summary: Create new department
 *     description: Creates a new department. Requires SuperAdmin or HR role.
 *     tags:
 *       - Departments
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - code
 *             properties:
 *               name:
 *                 type: string
 *                 example: Engineering
 *               code:
 *                 type: string
 *                 example: ENG
 *               description:
 *                 type: string
 *                 example: Software Engineering Department
 *               headEmployeeId:
 *                 type: string
 *                 example: "5"
 *               budget:
 *                 type: number
 *                 example: 5000000
 *     responses:
 *       201:
 *         description: Department created successfully
 *       400:
 *         description: Validation failed
 *       409:
 *         description: Department already exists
 *       500:
 *         description: Server error
 */
router.post('/', authenticate, authorize('CEO', 'SuperAdmin', 'HR'), createDepartment);

/**
 * @swagger
 * /departments/{id}:
 *   put:
 *     summary: Update department
 *     description: Updates an existing department. Requires SuperAdmin or HR role.
 *     tags:
 *       - Departments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               description:
 *                 type: string
 *               headEmployeeId:
 *                 type: string
 *               budget:
 *                 type: number
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Department updated successfully
 *       404:
 *         description: Department not found
 *       409:
 *         description: Duplicate name or code
 *       500:
 *         description: Server error
 */
router.put('/:id', authenticate, authorize('CEO', 'SuperAdmin', 'HR'), updateDepartment);

/**
 * @swagger
 * /departments/{id}:
 *   delete:
 *     summary: Delete department
 *     description: Soft deletes a department. Requires SuperAdmin role.
 *     tags:
 *       - Departments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Department deleted successfully
 *       400:
 *         description: Cannot delete - has active employees
 *       404:
 *         description: Department not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', authenticate, authorize('CEO', 'SuperAdmin'), deleteDepartment);

export default router;
