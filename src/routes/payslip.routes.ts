import { Router } from "express";

import {
  downloadPayslipPdf,
  getMyPayslips,
  getPayslipById,
  getPayslips,
  updatePayslip,
} from "../controllers/payslip.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();
const payrollAdmins = authorize("SuperAdmin", "HR");

/**
 * @swagger
 * /payslips:
 *   get:
 *     summary: List and filter payslips (SuperAdmin or HR)
 *     tags: [Payslips]
 *     security: [{ bearerAuth: [] }]
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
 *     tags: [Payslips]
 *     security: [{ bearerAuth: [] }]
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
 * /payslips/{id}:
 *   get:
 *     summary: Get one permitted payslip
 *     tags: [Payslips]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Payslip fetched }
 *       403: { description: Payslip access denied }
 *       404: { description: Payslip not found }
 *   patch:
 *     summary: Edit a draft payslip (SuperAdmin or HR)
 *     tags: [Payslips]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
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
 *       409: { description: Approved or paid payslip is immutable }
 */
router.get("/:id", authenticate, getPayslipById);
router.patch("/:id", authenticate, payrollAdmins, updatePayslip);

/**
 * @swagger
 * /payslips/{id}/pdf:
 *   get:
 *     summary: Download a permitted payslip as PDF
 *     tags: [Payslips]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Payslip PDF
 *         content:
 *           application/pdf:
 *             schema: { type: string, format: binary }
 */
router.get("/:id/pdf", authenticate, downloadPayslipPdf);

export default router;
