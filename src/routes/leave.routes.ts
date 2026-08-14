import express from "express";
import {
  getLeavePolicy,
  updateLeavePolicy,
  initializeLeaveBalances,
  getLeaveBalances,
  createLeaveRequest,
  getLeaveRequests,
  getLeaveRequestById,
  getPendingLeaveRequestsForManager,
  approveLeaveRequest,
  rejectLeaveRequest,
  cancelLeaveRequest,
} from "../controllers/leave.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = express.Router();

// Apply authentication to ALL leave routes
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Leave Management
 *   description: Leave requests, balances, and approvals with role-based authorization
 */

// ============================================================================
// LEAVE POLICY ROUTES
// ============================================================================

/**
 * @swagger
 * /leave/policy/{year}:
 *   get:
 *     summary: Get Leave Policy
 *     description: Get leave policy for a specific year (creates default if not exists)
 *     tags:
 *       - Leave Management
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: year
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *           example: 2026
 *         description: Year for the leave policy
 *     responses:
 *       200:
 *         description: Leave policy retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 year:
 *                   type: integer
 *                   example: 2026
 *                 privilegeLeaveBalance:
 *                   type: integer
 *                   example: 18
 *                 flexiLeaveBalance:
 *                   type: integer
 *                   example: 6
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/policy/:year", getLeavePolicy);

/**
 * @swagger
 * /leave/policy/{year}:
 *   put:
 *     summary: Update Leave Policy (HR/SuperAdmin Only)
 *     description: Update leave policy for a specific year. Requires HR or SuperAdmin role.
 *     tags:
 *       - Leave Management
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: year
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *           example: 2026
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               privilegeLeaveBalance:
 *                 type: integer
 *                 example: 18
 *               flexiLeaveBalance:
 *                 type: integer
 *                 example: 6
 *     responses:
 *       200:
 *         description: Leave policy updated successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions (requires HR or SuperAdmin role)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put("/policy/:year", authorize("HR", "SuperAdmin"), updateLeavePolicy);

// ============================================================================
// LEAVE BALANCE ROUTES
// ============================================================================

/**
 * @route   POST /api/leave/balance/initialize
 * @desc    Initialize leave balances for an employee (18 privilege + 6 flexi)
 * @access  HR/SuperAdmin only
 * @body    { employeeId: string, year: number }
 */
router.post("/balance/initialize", authorize("HR", "SuperAdmin"), initializeLeaveBalances);

/**
 * @route   GET /api/leave/balance/:employeeId
 * @desc    Get all leave balances for an employee
 * @access  Employee (own balance) or Manager/HR
 * @query   year (optional, defaults to current year)
 */
router.get("/balance/:employeeId", getLeaveBalances);

// ============================================================================
// LEAVE REQUEST ROUTES
// ============================================================================

/**
 * @swagger
 * /leave/request:
 *   post:
 *     summary: Create Leave Request
 *     description: Create a new leave request for the authenticated employee
 *     tags:
 *       - Leave Management
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeId
 *               - leaveType
 *               - fromDate
 *               - toDate
 *               - reason
 *             properties:
 *               employeeId:
 *                 type: string
 *                 example: "1"
 *               leaveType:
 *                 type: string
 *                 enum: [Privilege, Flexi, Sick, Maternity, Paternity, Emergency]
 *                 example: Privilege
 *               fromDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-08-15"
 *               toDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-08-16"
 *               isHalfDay:
 *                 type: boolean
 *                 example: false
 *               halfDayPeriod:
 *                 type: string
 *                 enum: [FirstHalf, SecondHalf]
 *                 example: FirstHalf
 *               reason:
 *                 type: string
 *                 example: "Personal work"
 *               contactNumber:
 *                 type: string
 *                 example: "+1234567890"
 *               emergencyContact:
 *                 type: string
 *                 example: "+0987654321"
 *               attachmentUrl:
 *                 type: string
 *                 example: "https://example.com/document.pdf"
 *               attachmentFileName:
 *                 type: string
 *                 example: "medical-certificate.pdf"
 *     responses:
 *       201:
 *         description: Leave request created successfully
 *       400:
 *         description: Invalid request data or insufficient leave balance
 *       401:
 *         description: Authentication required
 */
router.post("/request", createLeaveRequest);

/**
 * @swagger
 * /leave/request:
 *   get:
 *     summary: Get Leave Requests
 *     description: |
 *       Get leave requests with filtering options.
 *       Employees can only see their own requests.
 *       Managers and HR can see team/all requests.
 *     tags:
 *       - Leave Management
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: employeeId
 *         in: query
 *         schema:
 *           type: string
 *         description: Filter by employee ID (optional)
 *       - name: fromDate
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from date (optional)
 *       - name: toDate
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to date (optional)
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [Pending, Approved, Rejected, Cancelled]
 *         description: Filter by status (optional)
 *     responses:
 *       200:
 *         description: Leave requests retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get("/request", getLeaveRequests);

/**
 * @swagger
 * /leave/request/{id}:
 *   get:
 *     summary: Get Leave Request Details
 *     description: Get detailed information about a specific leave request
 *     tags:
 *       - Leave Management
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Leave request ID
 *     responses:
 *       200:
 *         description: Leave request details retrieved successfully
 *       404:
 *         description: Leave request not found
 *       401:
 *         description: Authentication required
 */
router.get("/request/:id", getLeaveRequestById);

/**
 * @swagger
 * /leave/request/pending/manager/{managerId}:
 *   get:
 *     summary: Get Pending Requests for Manager (Manager/HR Only)
 *     description: Get pending leave requests for a manager's team. Requires Manager, HR, or SuperAdmin role.
 *     tags:
 *       - Leave Management
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: managerId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Manager employee ID
 *     responses:
 *       200:
 *         description: Pending leave requests retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions (requires Manager, HR, or SuperAdmin role)
 */
router.get("/request/pending/manager/:managerId", authorize("Manager", "HR", "SuperAdmin"), getPendingLeaveRequestsForManager);

/**
 * @swagger
 * /leave/request/{id}/approve:
 *   put:
 *     summary: Approve Leave Request (Manager/HR Only)
 *     description: Approve a leave request. Requires Manager, HR, or SuperAdmin role.
 *     tags:
 *       - Leave Management
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Leave request ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reviewedById
 *             properties:
 *               reviewedById:
 *                 type: string
 *                 example: "2"
 *               reviewComments:
 *                 type: string
 *                 example: "Approved for personal reasons"
 *     responses:
 *       200:
 *         description: Leave request approved successfully
 *       404:
 *         description: Leave request not found
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions (requires Manager, HR, or SuperAdmin role)
 */
router.put("/request/:id/approve", authorize("Manager", "HR", "SuperAdmin"), approveLeaveRequest);

/**
 * @swagger
 * /leave/request/{id}/reject:
 *   put:
 *     summary: Reject Leave Request (Manager/HR Only)
 *     description: Reject a leave request. Requires Manager, HR, or SuperAdmin role.
 *     tags:
 *       - Leave Management
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Leave request ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reviewedById
 *               - reviewComments
 *             properties:
 *               reviewedById:
 *                 type: string
 *                 example: "2"
 *               reviewComments:
 *                 type: string
 *                 example: "Insufficient notice period"
 *     responses:
 *       200:
 *         description: Leave request rejected successfully
 *       404:
 *         description: Leave request not found
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions (requires Manager, HR, or SuperAdmin role)
 */
router.put("/request/:id/reject", authorize("Manager", "HR", "SuperAdmin"), rejectLeaveRequest);

/**
 * @swagger
 * /leave/request/{id}/cancel:
 *   put:
 *     summary: Cancel Leave Request
 *     description: Cancel a leave request (employee initiated)
 *     tags:
 *       - Leave Management
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Leave request ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeId
 *               - cancellationReason
 *             properties:
 *               employeeId:
 *                 type: string
 *                 example: "1"
 *               cancellationReason:
 *                 type: string
 *                 example: "Plans changed"
 *     responses:
 *       200:
 *         description: Leave request cancelled successfully
 *       404:
 *         description: Leave request not found
 *       401:
 *         description: Authentication required
 */
router.put("/request/:id/cancel", cancelLeaveRequest);

export default router;
