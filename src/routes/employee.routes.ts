// src/routes/employee.routes.ts
import { Router } from "express";
import {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
} from "../controllers/employee.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();

/**
 * @swagger
 * /employees:
 *   post:
 *     summary: Create a new employee
 *     description: Creates a new employee in the database. Requires SuperAdmin or HR role.
 *     tags:
 *       - Employees
 *     security:
 *       - bearerAuth: []
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
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: Diya Singha Roy
 *               emailAddress:
 *                 type: string
 *                 example: diya@gmail.com
 *               assignedRole:
 *                 type: string
 *                 enum: [SuperAdmin, Manager, Developer, Marketing, CustomStaff, HR]
 *                 example: Developer
 *               assignedDepartment:
 *                 type: string
 *                 example: Engineering
 *               baseSalary:
 *                 type: number
 *                 example: 50000
 *               allowances:
 *                 type: number
 *                 example: 5000
 *               deductions:
 *                 type: number
 *                 example: 1000
 *               password:
 *                 type: string
 *                 description: Optional - if not provided, a default password will be set
 *                 example: Password123!
 *     responses:
 *       201:
 *         description: Employee created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 employee:
 *                   type: object
 *                   properties:
 *                     employeeId:
 *                       type: string
 *                     fullName:
 *                       type: string
 *                     username:
 *                       type: string
 *                     emailAddress:
 *                       type: string
 *                     assignedRole:
 *                       type: string
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
router.post(
  "/",
  authenticate,
  authorize("SuperAdmin", "HR"),
  createEmployee
);

/**
 * @swagger
 * /employees:
 *   get:
 *     summary: Get all employees
 *     description: Returns a list of all employees. Accessible by SuperAdmin, HR, and Manager.
 *     tags:
 *       - Employees
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or email
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [SuperAdmin, Manager, Developer, Marketing, CustomStaff, HR]
 *         description: Filter by role
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: Employees fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 employees:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       employeeId:
 *                         type: string
 *                       fullName:
 *                         type: string
 *                       emailAddress:
 *                         type: string
 *                       username:
 *                         type: string
 *                       assignedRole:
 *                         type: string
 *                       assignedDepartment:
 *                         type: string
 *                       isActive:
 *                         type: boolean
 *                       joinedAt:
 *                         type: string
 *                         format: date-time
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
router.get(
  "/",
  authenticate,
  authorize("SuperAdmin", "HR", "Manager"),
  getEmployees
);

/**
 * @swagger
 * /employees/{id}:
 *   get:
 *     summary: Get employee by ID
 *     description: Returns a single employee using the employee ID. Accessible by SuperAdmin, HR, and Manager.
 *     tags:
 *       - Employees
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Employee ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Employee found successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 employeeId:
 *                   type: string
 *                 fullName:
 *                   type: string
 *                 emailAddress:
 *                   type: string
 *                 username:
 *                   type: string
 *                 assignedRole:
 *                   type: string
 *                 assignedDepartment:
 *                   type: string
 *                 baseSalary:
 *                   type: number
 *                 allowances:
 *                   type: number
 *                 deductions:
 *                   type: number
 *                 isActive:
 *                   type: boolean
 *                 joinedAt:
 *                   type: string
 *                   format: date-time
 *                 lastLogin:
 *                   type: string
 *                   format: date-time
 *                 managerId:
 *                   type: string
 *                 teamId:
 *                   type: string
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Employee not found
 *       500:
 *         description: Server error
 */
router.get(
  "/:id",
  authenticate,
  authorize("SuperAdmin", "HR", "Manager"),
  getEmployeeById
);

/**
 * @swagger
 * /employees/{id}:
 *   put:
 *     summary: Update an employee
 *     description: Updates an existing employee. Requires SuperAdmin or HR role.
 *     tags:
 *       - Employees
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Employee ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: Diya Roy
 *               emailAddress:
 *                 type: string
 *                 example: diya.roy@company.com
 *               assignedDepartment:
 *                 type: string
 *                 example: Human Resources
 *               assignedRole:
 *                 type: string
 *                 enum: [SuperAdmin, Manager, Developer, Marketing, CustomStaff, HR]
 *                 example: HR
 *               baseSalary:
 *                 type: number
 *                 example: 70000
 *               allowances:
 *                 type: number
 *                 example: 6000
 *               deductions:
 *                 type: number
 *                 example: 1200
 *               isActive:
 *                 type: boolean
 *                 example: true
 *               managerId:
 *                 type: string
 *                 description: ID of the manager
 *               teamId:
 *                 type: string
 *                 description: ID of the team
 *     responses:
 *       200:
 *         description: Employee updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 employee:
 *                   type: object
 *                   properties:
 *                     employeeId:
 *                       type: string
 *                     fullName:
 *                       type: string
 *                     emailAddress:
 *                       type: string
 *                     assignedRole:
 *                       type: string
 *                     assignedDepartment:
 *                       type: string
 *                     isActive:
 *                       type: boolean
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Employee not found
 *       500:
 *         description: Server error
 */
router.put(
  "/:id",
  authenticate,
  authorize("SuperAdmin", "HR"),
  updateEmployee
);

/**
 * @swagger
 * /employees/{id}:
 *   delete:
 *     summary: Delete an employee
 *     description: Deletes an employee from the database. Requires SuperAdmin role only.
 *     tags:
 *       - Employees
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Employee ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Employee deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Employee deleted successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions - SuperAdmin only
 *       404:
 *         description: Employee not found
 *       500:
 *         description: Server error
 */
router.delete(
  "/:id",
  authenticate,
  authorize("SuperAdmin"),
  deleteEmployee
);

/**
 * @swagger
 * /employees/{id}/status:
 *   patch:
 *     summary: Toggle employee active status
 *     description: Activates or deactivates an employee. Requires SuperAdmin or HR role.
 *     tags:
 *       - Employees
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Employee ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Employee status updated successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Employee not found
 *       500:
 *         description: Server error
 */
// Note: You'll need to add this controller function
// router.patch(
//   "/:id/status",
//   authenticate,
//   authorize("SuperAdmin", "HR"),
//   toggleEmployeeStatus
// );

export default router;