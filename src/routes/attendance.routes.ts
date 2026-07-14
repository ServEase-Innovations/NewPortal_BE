import { Router } from "express";

import {
  createAttendance,
  getAttendance,
  getAttendanceById,
  updateAttendance,
  deleteAttendance,
} from "../controllers/attendance.controller";

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
 *                 message:
 *                   type: string
 *                   example: Attendance created successfully
 *                 attendance:
 *                   type: object
 *                   properties:
 *                     attendanceId:
 *                       type: string
 *                       description: Unique attendance record ID
 *                     employeeId:
 *                       type: integer
 *                     calendarDate:
 *                       type: integer
 *                     shiftStatus:
 *                       type: string
 *                     clockInTimestamp:
 *                       type: integer
 *                     clockOutTimestamp:
 *                       type: integer
 *                     totalHoursComputed:
 *                       type: number
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
router.post("/", createAttendance);

/**
 * @swagger
 * /attendance:
 *   get:
 *     summary: Get all attendance records
 *     description: Returns a list of all attendance records with optional filtering. Accessible by SuperAdmin, HR, and Manager.
 *     tags:
 *       - Attendance
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: integer
 *         description: Filter by employee ID
 *         example: 1
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: integer
 *         description: Filter records from this date (epoch milliseconds)
 *         example: 1783728000000
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: integer
 *         description: Filter records until this date (epoch milliseconds)
 *         example: 1784937600000
 *       - in: query
 *         name: shiftStatus
 *         schema:
 *           type: string
 *           enum: [Working, OnLeave, Absent]
 *         description: Filter by shift status
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
 *     responses:
 *       200:
 *         description: Attendance records fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 attendance:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       attendanceId:
 *                         type: string
 *                       employeeId:
 *                         type: integer
 *                       calendarDate:
 *                         type: integer
 *                         description: Attendance date as epoch milliseconds
 *                       shiftStatus:
 *                         type: string
 *                       clockInTimestamp:
 *                         type: integer
 *                       clockOutTimestamp:
 *                         type: integer
 *                       totalHoursComputed:
 *                         type: number
 *                 total:
 *                   type: integer
 *                   description: Total number of records
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
router.get("/", getAttendance);

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
router.get("/:id", getAttendanceById);

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
router.put("/:id", updateAttendance);

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
router.delete("/:id", deleteAttendance);

export default router;