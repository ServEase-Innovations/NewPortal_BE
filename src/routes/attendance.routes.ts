import { Router, Request, Response, NextFunction } from "express";
import { EmployeeRole } from "@prisma/client";

import {
  createAttendance,
  getAttendance,
  getAttendanceById,
  updateAttendance,
  deleteAttendance,
  getAttendanceByEmployee,
  getTodayAttendanceByEmployee,
} from "../controllers/attendance.controller";
import { authenticate, authorize, AuthRequest } from "../middleware/auth.middleware";

// Middleware to check if user can access employee's data
const checkEmployeeAccess = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authReq = req as AuthRequest;
  const employeeIdParam = req.params.employeeId;
  
  // Handle potential array values
  const employeeIdStr = Array.isArray(employeeIdParam) ? employeeIdParam[0] : employeeIdParam;
  const requestedEmployeeId = Number.parseInt(employeeIdStr, 10);
  
  if (Number.isNaN(requestedEmployeeId)) {
    return res.status(400).json({
      message: "Invalid employee ID format",
    });
  }
  
  const currentEmployeeId = Number.parseInt(authReq.employee!.employeeId, 10);
  const role = authReq.employee!.assignedRole;

  // Allow if:
  // 1. User is requesting their own data
  // 2. User is SuperAdmin, HR, or Manager (can view all employees)
  if (
    currentEmployeeId === requestedEmployeeId ||
    role === EmployeeRole.SuperAdmin ||
    role === EmployeeRole.HR ||
    role === EmployeeRole.Manager
  ) {
    return next();
  }

  return res.status(403).json({
    message: "Access denied. You can only view your own attendance records.",
  });
};

const router = Router();

/**
 * @swagger
 * /attendance:
 *   post:
 *     summary: Create attendance record
 *     description: Creates a new attendance record for an employee. Records clock-in/out times and shift status.
 *     tags:
 *       - Attendance
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeId
 *               - calendarDate
 *               - shiftStatus
 *             properties:
 *               employeeId:
 *                 type: integer
 *                 description: Numeric employee ID
 *                 example: 1
 *               calendarDate:
 *                 type: integer
 *                 description: Attendance date as epoch milliseconds
 *                 example: 1783728000000
 *               shiftStatus:
 *                 type: string
 *                 enum:
 *                   - Working
 *                   - OnLeave
 *                   - Absent
 *                 description: Employee's shift status for the day
 *                 example: Working
 *               clockInTimestamp:
 *                 type: integer
 *                 description: Clock-in time as epoch milliseconds (optional)
 *                 example: 1783760400000
 *               clockOutTimestamp:
 *                 type: integer
 *                 description: Clock-out time as epoch milliseconds (optional)
 *                 example: 1783791000000
 *               totalHoursComputed:
 *                 type: number
 *                 description: Total hours worked (automatically computed if clock-in/out provided)
 *                 example: 8.5
 *     responses:
 *       201:
 *         description: Attendance created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 attendanceId:
 *                   type: string
 *                   description: Unique attendance record ID
 *                 employeeId:
 *                   type: integer
 *                 calendarDate:
 *                   type: integer
 *                 shiftStatus:
 *                   type: string
 *                 clockInTimestamp:
 *                   type: integer
 *                 clockOutTimestamp:
 *                   type: integer
 *                 totalHoursComputed:
 *                   type: number
 *       400:
 *         description: Validation failed or invalid input
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       409:
 *         description: Attendance record already exists for this date
 *       500:
 *         description: Server error
 */
router.post("/", authenticate, createAttendance);

/**
 * @swagger
 * /attendance:
 *   get:
 *     summary: Get all attendance records
 *     description: Returns a list of all attendance records. Accessible by SuperAdmin, HR, and Manager.
 *     tags:
 *       - Attendance
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Attendance records fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   attendanceId:
 *                     type: string
 *                   employeeId:
 *                     type: integer
 *                   calendarDate:
 *                     type: integer
 *                     description: Attendance date as epoch milliseconds
 *                   shiftStatus:
 *                     type: string
 *                   clockInTimestamp:
 *                     type: integer
 *                   clockOutTimestamp:
 *                     type: integer
 *                   totalHoursComputed:
 *                     type: number
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions (requires SuperAdmin, HR, or Manager role)
 *       500:
 *         description: Server error
 */
router.get("/", authenticate, authorize(EmployeeRole.SuperAdmin, EmployeeRole.HR, EmployeeRole.Manager), getAttendance);

/**
 * @swagger
 * /attendance/{id}:
 *   get:
 *     summary: Get attendance by ID
 *     tags:
 *       - Attendance
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Attendance found
 */
router.get("/:id", authenticate, getAttendanceById);

/**
 * @swagger
 * /attendance/{id}:
 *   put:
 *     summary: Update attendance
 *     tags:
 *       - Attendance
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Attendance updated
 */
router.put("/:id", authenticate, updateAttendance);

/**
 * @swagger
 * /attendance/{id}:
 *   delete:
 *     summary: Delete attendance
 *     tags:
 *       - Attendance
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Attendance deleted
 */
router.delete("/:id", authenticate, authorize(EmployeeRole.SuperAdmin, EmployeeRole.HR), deleteAttendance);

/**
 * @swagger
 * /attendance/employee/{employeeId}:
 *   get:
 *     summary: Get attendance records for a specific employee
 *     description: Returns all attendance records for the specified employee, ordered by date (newest first)
 *     tags:
 *       - Attendance
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Employee ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Employee attendance records fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   attendanceId:
 *                     type: string
 *                   employeeId:
 *                     type: integer
 *                   calendarDate:
 *                     type: integer
 *                     description: Attendance date as epoch milliseconds
 *                   shiftStatus:
 *                     type: string
 *                   clockInTimestamp:
 *                     type: integer
 *                   clockOutTimestamp:
 *                     type: integer
 *                   totalHoursComputed:
 *                     type: number
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
router.get("/employee/:employeeId", authenticate, checkEmployeeAccess, getAttendanceByEmployee);

/**
 * @swagger
 * /attendance/employee/{employeeId}/today:
 *   get:
 *     summary: Get today's attendance for a specific employee
 *     description: Returns today's attendance record for the specified employee (if exists)
 *     tags:
 *       - Attendance
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Employee ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Today's attendance record found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 attendanceId:
 *                   type: string
 *                 employeeId:
 *                   type: integer
 *                 calendarDate:
 *                   type: integer
 *                   description: Attendance date as epoch milliseconds
 *                 shiftStatus:
 *                   type: string
 *                 clockInTimestamp:
 *                   type: integer
 *                 clockOutTimestamp:
 *                   type: integer
 *                 totalHoursComputed:
 *                   type: number
 *       404:
 *         description: No attendance record found for today
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
router.get("/employee/:employeeId/today", authenticate, checkEmployeeAccess, getTodayAttendanceByEmployee);

export default router;