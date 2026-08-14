import { Router } from "express";
import {
  triggerMonthlyPayslipGeneration,
  generatePayslipsForSpecificMonth,
  generateHistoricalPayslipsController,
  generatePayslipsForDateRangeController,
  getPayslipCoverageController,
  getPayslipSchedulerStatus,
  startScheduler,
  stopScheduler,
} from "../controllers/payslip-automation.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();

// Payroll administrators: SuperAdmin and Manager
const payrollAdmins = authorize("SuperAdmin", "Manager");
const superAdminOnly = authorize("SuperAdmin");

/**
 * @swagger
 * tags:
 *   name: Payslip Automation
 *   description: Automatic payslip generation and scheduling endpoints
 */

/**
 * @swagger
 * /payslips/automation/generate-monthly:
 *   post:
 *     summary: Manually trigger monthly payslip generation for all employees
 *     description: |
 *       Generates payslips for all active employees for the current month.
 *       This is useful for manual runs or testing the automation.
 *       Only SuperAdmin and Manager roles can trigger this.
 *     tags:
 *       - Payslip Automation
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Monthly payslip generation completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Monthly payslip generation completed"
 *                 result:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     totalEmployees:
 *                       type: number
 *                       example: 25
 *                     successfulPayslips:
 *                       type: number
 *                       example: 24
 *                     failedPayslips:
 *                       type: number
 *                       example: 1
 *                     generationTimeMs:
 *                       type: number
 *                       example: 5430
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           employeeId:
 *                             type: string
 *                           error:
 *                             type: string
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions (requires SuperAdmin or Manager role)
 *       500:
 *         description: Generation failed
 */
router.post("/generate-monthly", authenticate, payrollAdmins, triggerMonthlyPayslipGeneration);

/**
 * @swagger
 * /payslips/automation/generate-for-month:
 *   post:
 *     summary: Generate payslips for a specific month/year for all employees
 *     description: |
 *       Generates payslips for all active employees for a specified month and year.
 *       Useful for catch-up operations or correcting missed generations.
 *       Only SuperAdmin and Manager roles can trigger this.
 *     tags:
 *       - Payslip Automation
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - month
 *               - year
 *             properties:
 *               month:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 12
 *                 example: 11
 *                 description: Month (1-12)
 *               year:
 *                 type: number
 *                 minimum: 2020
 *                 example: 2026
 *                 description: Year
 *     responses:
 *       200:
 *         description: Payslip generation for specified month completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Payslip generation for 11/2026 completed"
 *                 period:
 *                   type: object
 *                   properties:
 *                     month:
 *                       type: number
 *                     year:
 *                       type: number
 *                 result:
 *                   $ref: '#/components/schemas/BulkPayslipResult'
 *       400:
 *         description: Invalid month or year
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Generation failed
 */
router.post("/generate-for-month", authenticate, payrollAdmins, generatePayslipsForSpecificMonth);

/**
 * @swagger
 * /payslips/automation/generate-historical:
 *   post:
 *     summary: Generate historical payslips from January 2026 to current month
 *     description: |
 *       Generates payslips for all active employees from January 2026 up to the current month.
 *       This is useful for setting up the system or catching up on missing payslips.
 *       Only SuperAdmin and Manager roles can trigger this operation.
 *       **Warning**: This is a long-running operation that may take several minutes.
 *     tags:
 *       - Payslip Automation
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Historical payslip generation completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Historical payslip generation completed"
 *                 result:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     totalMonths:
 *                       type: number
 *                       example: 8
 *                     successfulMonths:
 *                       type: number
 *                       example: 7
 *                     failedMonths:
 *                       type: number
 *                       example: 1
 *                     totalGenerationTime:
 *                       type: number
 *                       example: 45600
 *                     monthResults:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           month:
 *                             type: number
 *                           year:
 *                             type: number
 *                           success:
 *                             type: boolean
 *                           totalEmployees:
 *                             type: number
 *                           successfulPayslips:
 *                             type: number
 *                           failedPayslips:
 *                             type: number
 *                     overallErrors:
 *                       type: array
 *                       items:
 *                         type: string
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Historical generation failed
 */
router.post("/generate-historical", authenticate, payrollAdmins, generateHistoricalPayslipsController);

/**
 * @swagger
 * /payslips/automation/generate-date-range:
 *   post:
 *     summary: Generate payslips for a custom date range
 *     description: |
 *       Generates payslips for all active employees within a specified date range.
 *       Useful for generating specific months or catching up on missed periods.
 *       Only SuperAdmin and Manager roles can trigger this operation.
 *     tags:
 *       - Payslip Automation
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - startMonth
 *               - startYear
 *               - endMonth
 *               - endYear
 *             properties:
 *               startMonth:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 12
 *                 example: 1
 *                 description: Starting month (1-12)
 *               startYear:
 *                 type: number
 *                 minimum: 2020
 *                 example: 2026
 *                 description: Starting year
 *               endMonth:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 12
 *                 example: 6
 *                 description: Ending month (1-12)
 *               endYear:
 *                 type: number
 *                 minimum: 2020
 *                 example: 2026
 *                 description: Ending year
 *     responses:
 *       200:
 *         description: Date range payslip generation completed
 *       400:
 *         description: Invalid date range parameters
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Generation failed
 */
router.post("/generate-date-range", authenticate, payrollAdmins, generatePayslipsForDateRangeController);

/**
 * @swagger
 * /payslips/automation/coverage:
 *   get:
 *     summary: Get payslip coverage analysis
 *     description: |
 *       Analyzes existing payslips to identify which months have complete coverage
 *       and which months are missing payslips. Useful for identifying gaps before
 *       running historical generation.
 *     tags:
 *       - Payslip Automation
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Coverage analysis completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Payslip coverage analysis completed"
 *                 coverage:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       month:
 *                         type: number
 *                         example: 1
 *                       year:
 *                         type: number
 *                         example: 2026
 *                       totalPayslips:
 *                         type: number
 *                         example: 25
 *                       totalEmployees:
 *                         type: number
 *                         example: 25
 *                       coveragePercentage:
 *                         type: number
 *                         example: 100
 *                 missingMonths:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       month:
 *                         type: number
 *                       year:
 *                         type: number
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalMonthsCovered:
 *                       type: number
 *                       example: 7
 *                     totalMonthsExpected:
 *                       type: number
 *                       example: 8
 *                     overallCoveragePercentage:
 *                       type: number
 *                       example: 87.5
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 */
router.get("/coverage", authenticate, payrollAdmins, getPayslipCoverageController);

/**
 * @swagger
 * /payslips/automation/scheduler/status:
 *   get:
 *     summary: Get payslip automation scheduler status
 *     description: |
 *       Returns the current status of the automatic payslip generation scheduler,
 *       including configuration, next run time, and current state.
 *     tags:
 *       - Payslip Automation
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Scheduler status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 scheduler:
 *                   type: object
 *                   properties:
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     isRunning:
 *                       type: boolean
 *                       example: false
 *                     nextScheduledRun:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       example: "2026-08-31T23:30:00.000Z"
 *                     taskName:
 *                       type: string
 *                       nullable: true
 *                       example: "monthly-payslip-generation"
 *                 configuration:
 *                   type: object
 *                   properties:
 *                     enabled:
 *                       type: boolean
 *                       example: true
 *                     cronExpression:
 *                       type: string
 *                       example: "30 23 28-31 * *"
 *                     timezone:
 *                       type: string
 *                       example: "Asia/Kolkata"
 *                     retryAttempts:
 *                       type: number
 *                       example: 3
 *                     retryDelayMs:
 *                       type: number
 *                       example: 300000
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 */
router.get("/scheduler/status", authenticate, payrollAdmins, getPayslipSchedulerStatus);

/**
 * @swagger
 * /payslips/automation/scheduler/start:
 *   post:
 *     summary: Start the automatic payslip scheduler (SuperAdmin only)
 *     description: |
 *       Starts the automatic payslip generation scheduler that runs on the last day of each month.
 *       Only SuperAdmin can control the scheduler.
 *     tags:
 *       - Payslip Automation
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Scheduler started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Payslip scheduler started successfully"
 *                 status:
 *                   type: object
 *                   description: Current scheduler status
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Only SuperAdmin can control the scheduler
 *       500:
 *         description: Failed to start scheduler
 */
router.post("/scheduler/start", authenticate, superAdminOnly, startScheduler);

/**
 * @swagger
 * /payslips/automation/scheduler/stop:
 *   post:
 *     summary: Stop the automatic payslip scheduler (SuperAdmin only)
 *     description: |
 *       Stops the automatic payslip generation scheduler.
 *       Only SuperAdmin can control the scheduler.
 *     tags:
 *       - Payslip Automation
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Scheduler stopped successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Payslip scheduler stopped successfully"
 *                 status:
 *                   type: object
 *                   description: Current scheduler status
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Only SuperAdmin can control the scheduler
 *       500:
 *         description: Failed to stop scheduler
 */
router.post("/scheduler/stop", authenticate, superAdminOnly, stopScheduler);

export default router;