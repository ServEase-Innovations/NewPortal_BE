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
 *     description: Creates a new employee in the database.
 *     tags:
 *       - Employees
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: Diya Singha Roy
 *               emailAddress:
 *                 type: string
 *                 example: diya@gmail.com
 *               assignedRole:
 *                 type: string
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
 *     description: Returns a list of all employees.
 *     tags:
 *       - Employees
 *     responses:
 *       200:
 *         description: Employees fetched successfully.
 */
router.get("/", getEmployees);
/**
 * @swagger
 * /employees/{id}:
 *   get:
 *     summary: Get employee by ID
 *     description: Returns a single employee using the employee ID.
 *     tags:
 *       - Employees
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
 *       404:
 *         description: Employee not found
 */
router.get("/:id", getEmployeeById);
/**
 * @swagger
 * /employees/{id}:
 *   put:
 *     summary: Update an employee
 *     description: Updates an existing employee.
 *     tags:
 *       - Employees
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
 *               assignedDepartment:
 *                 type: string
 *                 example: HR
 *               assignedRole:
 *                 type: string
 *                 example: Manager
 *               baseSalary:
 *                 type: number
 *                 example: 70000
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
 *     summary: Delete an employee
 *     description: Deletes an employee from the database.
 *     tags:
 *       - Employees
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
 *       404:
 *         description: Employee not found
 */
router.delete("/:id", deleteEmployee);

export default router;