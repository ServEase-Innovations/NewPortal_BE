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

const router = express.Router();

// ============================================================================
// LEAVE POLICY ROUTES
// ============================================================================

/**
 * @route   GET /api/leave/policy/:year
 * @desc    Get leave policy for a specific year (creates default if not exists)
 * @access  All authenticated users
 */
router.get("/policy/:year", getLeavePolicy);

/**
 * @route   PUT /api/leave/policy/:year
 * @desc    Update leave policy for a specific year
 * @access  HR/SuperAdmin only
 */
router.put("/policy/:year", updateLeavePolicy);

// ============================================================================
// LEAVE BALANCE ROUTES
// ============================================================================

/**
 * @route   POST /api/leave/balance/initialize
 * @desc    Initialize leave balances for an employee (18 privilege + 6 flexi)
 * @access  HR/SuperAdmin only
 * @body    { employeeId: string, year: number }
 */
router.post("/balance/initialize", initializeLeaveBalances);

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
 * @route   POST /api/leave/request
 * @desc    Create a new leave request
 * @access  All authenticated users
 * @body    {
 *   employeeId: string,
 *   leaveType: LeaveType,
 *   fromDate: string (YYYY-MM-DD),
 *   toDate: string (YYYY-MM-DD),
 *   isHalfDay: boolean,
 *   halfDayPeriod: "FirstHalf" | "SecondHalf",
 *   reason: string,
 *   contactNumber: string,
 *   emergencyContact: string,
 *   attachmentUrl: string,
 *   attachmentFileName: string
 * }
 */
router.post("/request", createLeaveRequest);

/**
 * @route   GET /api/leave/request
 * @desc    Get leave requests (by employee or date range)
 * @access  Employee (own requests) or Manager/HR (team/all requests)
 * @query   employeeId (optional) OR fromDate + toDate (optional)
 * @query   status (optional): Pending, Approved, Rejected, Cancelled
 */
router.get("/request", getLeaveRequests);

/**
 * @route   GET /api/leave/request/:id
 * @desc    Get a specific leave request by ID
 * @access  Employee (own request) or Manager/HR
 */
router.get("/request/:id", getLeaveRequestById);

/**
 * @route   GET /api/leave/request/pending/manager/:managerId
 * @desc    Get pending leave requests for a manager's team
 * @access  Manager/HR only
 */
router.get("/request/pending/manager/:managerId", getPendingLeaveRequestsForManager);

/**
 * @route   PUT /api/leave/request/:id/approve
 * @desc    Approve a leave request
 * @access  Manager/HR only
 * @body    { reviewedById: string, reviewComments?: string }
 */
router.put("/request/:id/approve", approveLeaveRequest);

/**
 * @route   PUT /api/leave/request/:id/reject
 * @desc    Reject a leave request
 * @access  Manager/HR only
 * @body    { reviewedById: string, reviewComments: string }
 */
router.put("/request/:id/reject", rejectLeaveRequest);

/**
 * @route   PUT /api/leave/request/:id/cancel
 * @desc    Cancel a leave request (employee initiated)
 * @access  Employee (own request)
 * @body    { employeeId: string, cancellationReason: string }
 */
router.put("/request/:id/cancel", cancelLeaveRequest);

export default router;
