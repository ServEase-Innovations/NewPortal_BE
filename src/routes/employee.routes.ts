import { Router } from "express";

import {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
} from "../controllers/employee.controller";

const router = Router();

/**
 * @swagger
 * /employees:
 *   post:
 *     summary: Create a new employee
 *     description: Creates a new employee.
 *     tags:
 *       - Employees
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - emailAddress
 *               - password
 *               - assignedRole
 *               - assignedDepartment
 *               - baseAddress
 *               - workAddress
 *               - baseSalary
 *               - allowances
 *               - deductions
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: Diyasha Singha Roy
 *               emailAddress:
 *                 type: string
 *                 example: diya@gmail.com
 *               password:
 *                 type: string
 *                 example: Diya@2003
 *               assignedRole:
 *                 type: string
 *                 enum:
 *                   - SuperAdmin
 *                   - Manager
 *                   - Developer
 *                   - Marketing
 *                   - CustomStaff
 *                 example: Developer
 *               assignedDepartment:
 *                 type: string
 *                 example: Engineering
 *               baseAddress:
 *                 type: string
 *                 example: Kolkata, West Bengal
 *               workAddress:
 *                 type: string
 *                 example: Sector V, Salt Lake, Kolkata
 *               baseSalary:
 *                 type: number
 *                 example: 50000
 *               allowances:
 *                 type: number
 *                 example: 5000
 *               deductions:
 *                 type: number
 *                 example: 1000
 *               teamId:
 *                 type: string
 *                 example: cmr4qgsae00009kvheaipdt0e
 *               managerId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Employee created successfully
 */
router.post("/", createEmployee);

/**
 * @swagger
 * /employees:
 *   get:
 *     summary: Get all employees
 *     description: Returns all employees.
 *     tags:
 *       - Employees
 *     responses:
 *       200:
 *         description: Employees fetched successfully
 */
router.get("/", getEmployees);

/**
 * @swagger
 * /employees/{id}:
 *   get:
 *     summary: Get employee by ID
 *     description: Returns an employee by ID.
 *     tags:
 *       - Employees
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Employee ID
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Employee found
 *       404:
 *         description: Employee not found
 */
router.get("/:id", getEmployeeById);

/**
 * @swagger
 * /employees/{id}:
 *   put:
 *     summary: Update employee
 *     description: Update an existing employee.
 *     tags:
 *       - Employees
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Employee ID
 *         schema:
 *           type: integer
 *           example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: Diyasha Roy
 *               emailAddress:
 *                 type: string
 *                 example: diya@gmail.com
 *               password:
 *                 type: string
 *                 example: NewPassword@123
 *               assignedRole:
 *                 type: string
 *                 example: Manager
 *               assignedDepartment:
 *                 type: string
 *                 example: HR
 *               baseAddress:
 *                 type: string
 *                 example: Kolkata
 *               workAddress:
 *                 type: string
 *                 example: New Town
 *               baseSalary:
 *                 type: number
 *                 example: 70000
 *               allowances:
 *                 type: number
 *                 example: 7000
 *               deductions:
 *                 type: number
 *                 example: 1000
 *               teamId:
 *                 type: string
 *                 example: cmr4qgsae00009kvheaipdt0e
 *               managerId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Employee updated successfully
 *       404:
 *         description: Employee not found
 */
router.put("/:id", updateEmployee);

/**
 * @swagger
 * /employees/{id}:
 *   delete:
 *     summary: Delete employee
 *     description: Deletes an employee.
 *     tags:
 *       - Employees
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Employee ID
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Employee deleted successfully
 *       404:
 *         description: Employee not found
 */
router.delete("/:id", deleteEmployee);

export default router;