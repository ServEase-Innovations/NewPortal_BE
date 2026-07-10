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
 *     summary: Create attendance
 *     description: Marks attendance for an employee.
 *     tags:
 *       - Attendance
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               employeeId:
 *                 type: integer
 *                 description: Numeric employee ID
 *                 example: 1
 *               calendarDate:
 *                 type: string
 *                 format: date
 *               shiftStatus:
 *                 type: string
 *                 enum:
 *                   - Working
 *                   - OnLeave
 *                   - Absent
 *               clockInTimestamp:
 *                 type: string
 *                 format: date-time
 *               clockOutTimestamp:
 *                 type: string
 *                 format: date-time
 *               totalHoursComputed:
 *                 type: number
 *     responses:
 *       201:
 *         description: Attendance created successfully
 */
router.post("/", createAttendance);

/**
 * @swagger
 * /attendance:
 *   get:
 *     summary: Get all attendance records
 *     tags:
 *       - Attendance
 *     responses:
 *       200:
 *         description: Attendance fetched successfully
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