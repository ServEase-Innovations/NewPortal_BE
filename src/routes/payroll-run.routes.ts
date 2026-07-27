import { Router } from "express";

import {
  approvePayrollRun,
  createPayrollRun,
  generatePayslips,
  getPayrollRunById,
  getPayrollRuns,
  markPayrollRunPaid,
} from "../controllers/payslip.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();
const payrollAdmins = authorize("SuperAdmin", "HR");

/**
 * @swagger
 * /payroll-runs:
 *   post:
 *     summary: Create a monthly payroll run
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [payrollMonth, payrollYear]
 *             properties:
 *               payrollMonth: { type: integer, minimum: 1, maximum: 12, example: 7 }
 *               payrollYear: { type: integer, example: 2026 }
 *               currency: { type: string, minLength: 3, maxLength: 3, default: INR }
 *     responses:
 *       201: { description: Payroll run created }
 *       409: { description: A payroll run already exists for the selected month }
 *   get:
 *     summary: List payroll runs
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [Draft, Processing, Approved, Paid, Cancelled] }
 *     responses:
 *       200: { description: Payroll runs fetched }
 */
router
  .route("/")
  .post(authenticate, payrollAdmins, createPayrollRun)
  .get(authenticate, payrollAdmins, getPayrollRuns);

/**
 * @swagger
 * /payroll-runs/{id}:
 *   get:
 *     summary: Get a payroll run and its payslips
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, example: "1" }
 *     responses:
 *       200: { description: Payroll run fetched }
 *       404: { description: Payroll run not found }
 */
router.get("/:id", authenticate, payrollAdmins, getPayrollRunById);

/**
 * @swagger
 * /payroll-runs/{id}/generate:
 *   post:
 *     summary: Generate draft payslips from employee salary and attendance snapshots
 *     description: Generates all active employees by default. Existing payslips in the run are skipped safely.
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               employeeIds:
 *                 type: array
 *                 items: { type: string, example: "4" }
 *     responses:
 *       201: { description: Draft payslips generated }
 *       409: { description: Payroll run is not Draft }
 */
router.post("/:id/generate", authenticate, payrollAdmins, generatePayslips);

/**
 * @swagger
 * /payroll-runs/{id}/approve:
 *   patch:
 *     summary: Approve a payroll run and lock all draft payslips
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Payroll run approved }
 *       409: { description: Payroll run cannot be approved }
 */
router.patch("/:id/approve", authenticate, payrollAdmins, approvePayrollRun);

/**
 * @swagger
 * /payroll-runs/{id}/mark-paid:
 *   patch:
 *     summary: Mark an approved payroll run and all its payslips as paid
 *     tags: [Payroll]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paymentReference: { type: string, example: BANK-BATCH-2026-07 }
 *     responses:
 *       200: { description: Payroll run marked paid }
 *       409: { description: Payroll run is not Approved }
 */
router.patch("/:id/mark-paid", authenticate, payrollAdmins, markPayrollRunPaid);

export default router;
