import { Router } from "express";

import {
  downloadPayslipPdfByEmployee,
  generatePayslipForEmployee,
  getMyPayslips,
  getPayslips,
  getPayslipsByEmployee,
  updatePayslipByEmployee,
} from "../controllers/payslip.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();

// SuperAdmin and Manager have full access to every payslip workflow,
// including generating payslips as many times as needed.
const payrollAdmins = authorize("SuperAdmin", "Manager");

/**
 * @swagger
 * /payslips/generate:
 *   post:
 *     summary: Generate a payslip for one employee (SuperAdmin or Manager)
 *     description: >
 *       employeeId is the only identifier used for every subsequent
 *       read/update/download operation. The target payroll run for
 *       month/year is found automatically, or created if it doesn't exist
 *       yet. This works even if that payroll run has already been Approved
 *       or marked Paid - generating a payslip for a new employee never
 *       triggers a run-status conflict. If `date` falls after the run's
 *       period start (e.g. the employee's joining date), the payable
 *       period is prorated from that date onward.
 *     tags: [Payslips]
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [employeeId, date, month, year]
 *             properties:
 *               employeeId: { type: string, example: "42" }
 *               date: { type: string, example: "2026-07-15" }
 *               month: { type: integer, minimum: 1, maximum: 12, example: 7 }
 *               year: { type: integer, example: 2026 }
 *     responses:
 *       201: { description: Payslip generated }
 *       404: { description: Active employee not found }
 *       409: { description: A payslip already exists for this employee in the selected period }
 */
router.post("/generate", authenticate, payrollAdmins, generatePayslipForEmployee);

/**
 * @swagger
 * /payslips:
 *   get:
 *     summary: List and filter payslips (SuperAdmin or Manager)
 *     tags: [Payslips]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema: { type: string }
 *       - in: query
 *         name: month
 *         schema: { type: integer, minimum: 1, maximum: 12 }
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [Draft, Approved, Paid, Cancelled] }
 *     responses:
 *       200: { description: Payslips fetched }
 */
router.get("/", authenticate, payrollAdmins, getPayslips);

/**
 * @swagger
 * /payslips/mine:
 *   get:
 *     summary: Get the authenticated employee's approved or paid payslips
 *     description: >
 *       Developer, Marketing, CustomStaff and HR can only see their own
 *       Approved/Paid payslips for the current or previous month.
 *       SuperAdmin/Manager are not subject to that restriction.
 *     tags: [Payslips]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: integer, minimum: 1, maximum: 12 }
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [Approved, Paid] }
 *     responses:
 *       200: { description: Employee payslips fetched }
 */
router.get("/mine", authenticate, getMyPayslips);

/**
 * @swagger
 * /payslips/employee/{employeeId}:
 *   get:
 *     summary: Get an employee's payslip(s) - employeeId is the only identifier used
 *     description: >
 *       Pass month & year to fetch exactly one period; omit them (admins
 *       only) to list the employee's full payslip history. Restricted
 *       roles must always supply month & year, may only query themselves,
 *       and are limited to the current or previous month.
 *     tags: [Payslips]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema: { type: string, example: "42" }
 *       - in: query
 *         name: month
 *         schema: { type: integer, minimum: 1, maximum: 12 }
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [Draft, Approved, Paid, Cancelled] }
 *     responses:
 *       200: { description: Payslip(s) fetched }
 *       403: { description: Access denied }
 *       404: { description: Payslip not found }
 *   patch:
 *     summary: Edit a draft payslip by employeeId + period (SuperAdmin or Manager)
 *     tags: [Payslips]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema: { type: string, example: "42" }
 *       - in: query
 *         name: month
 *         required: true
 *         schema: { type: integer, minimum: 1, maximum: 12 }
 *       - in: query
 *         name: year
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               workingDays: { type: number, example: 23 }
 *               payableDays: { type: number, example: 22 }
 *               unpaidLeaveDays: { type: number, example: 1 }
 *               bankAccountMasked: { type: string, nullable: true, example: "XXXXXX4582" }
 *               earnings:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [earningType, amount]
 *                   properties:
 *                     earningType: { type: string, example: Performance Bonus }
 *                     description: { type: string, nullable: true }
 *                     amount: { type: number, example: 5000 }
 *                     isTaxable: { type: boolean, default: true }
 *               deductions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [deductionType, amount]
 *                   properties:
 *                     deductionType: { type: string, example: Professional Tax }
 *                     description: { type: string, nullable: true }
 *                     amount: { type: number, example: 200 }
 *     responses:
 *       200: { description: Draft payslip updated and totals recalculated }
 *       404: { description: No payslip found for this employee in the selected period }
 *       409: { description: Approved or paid payslip is immutable }
 */
router.get("/employee/:employeeId", authenticate, getPayslipsByEmployee);
router.patch("/employee/:employeeId", authenticate, payrollAdmins, updatePayslipByEmployee);

/**
 * @swagger
 * /payslips/employee/{employeeId}/pdf:
 *   get:
 *     summary: Download a payslip PDF by employeeId + period
 *     description: >
 *       Restricted roles (Developer, Marketing, CustomStaff, HR) may only
 *       download their own payslip PDF, and only for the current or
 *       previous month. SuperAdmin/Manager may download any employee's
 *       payslip PDF for any period.
 *     tags: [Payslips]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema: { type: string, example: "42" }
 *       - in: query
 *         name: month
 *         required: true
 *         schema: { type: integer, minimum: 1, maximum: 12 }
 *       - in: query
 *         name: year
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Payslip PDF
 *         content:
 *           application/pdf:
 *             schema: { type: string, format: binary }
 *       403: { description: Access denied }
 *       404: { description: Payslip not found }
 */
router.get("/employee/:employeeId/pdf", authenticate, downloadPayslipPdfByEmployee);

export default router;
