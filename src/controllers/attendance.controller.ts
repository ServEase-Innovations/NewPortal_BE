import { Request, Response } from "express";
import {
  createAttendanceService,
  getAttendanceService,
  getAttendanceByIdService,
  updateAttendanceService,
  deleteAttendanceService,
} from "../services/attendance.service";

import { createAttendanceSchema, updateAttendanceSchema } from "../validations/attendance.validation";

// Serialization helper to convert BigInt to number (epoch milliseconds)
const serializeAttendance = (attendance: any) => ({
  ...attendance,
  attendanceId: attendance.attendanceId.toString(),
  employeeId: attendance.employeeId ? attendance.employeeId.toString() : null,
  calendarDate: attendance.calendarDate 
    ? Number(attendance.calendarDate)
    : null,
  clockInTimestamp: attendance.clockInTimestamp 
    ? Number(attendance.clockInTimestamp)
    : null,
  clockOutTimestamp: attendance.clockOutTimestamp
    ? Number(attendance.clockOutTimestamp)
    : null,
  // Serialize nested employee if present
  employee: attendance.employee ? {
    ...attendance.employee,
    employeeId: attendance.employee.employeeId.toString(),
    managerId: attendance.employee.managerId ? attendance.employee.managerId.toString() : null,
    joinedAt: attendance.employee.joinedAt ? Number(attendance.employee.joinedAt) : null,
    last_login: attendance.employee.last_login ? Number(attendance.employee.last_login) : null,
  } : undefined,
});

export const createAttendance = async (
  req: Request,
  res: Response
) => {
  try {
    const result = createAttendanceSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.flatten(),
      });
    }

    const data: any = { ...result.data };

    // Convert employeeId string to BigInt
    if (data.employeeId) {
      data.employeeId = BigInt(data.employeeId);
<<<<<<< HEAD
=======
    }

    // Convert calendarDate to epoch milliseconds (BigInt)
    if (data.calendarDate) {
      const date = new Date(data.calendarDate);
      data.calendarDate = BigInt(date.getTime());
>>>>>>> aec3bf3 (add daily task submission feature)
    }

    // Convert epoch number to BigInt (already in milliseconds)
    if (data.calendarDate) {
      data.calendarDate = BigInt(data.calendarDate);
    }

    // Convert epoch numbers to BigInt
    if (data.clockInTimestamp) {
      data.clockInTimestamp = BigInt(data.clockInTimestamp);
    }

    if (data.clockOutTimestamp) {
      data.clockOutTimestamp = BigInt(data.clockOutTimestamp);
    }

    const attendance = await createAttendanceService(data);

    res.status(201).json(
      serializeAttendance(attendance)
    );
  } catch (error: any) {
    console.error(error);

    res.status(500).json({
      message: error.message,
    });
  }
};

export const getAttendance = async (
  req: Request,
  res: Response
) => {
  try {
    const attendance = await getAttendanceService();

    res.json(
      attendance.map((item:any) =>
        serializeAttendance(item)
      )
    );
  } catch (error: any) {
    console.error(error);

    res.status(500).json({
      message: error.message,
    });
  }
};

export const getAttendanceById = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const attendance =
      await getAttendanceByIdService(
        BigInt(req.params.id)
      );

    if (!attendance) {
      return res.status(404).json({
        message: "Attendance not found",
      });
    }

    res.json(
      serializeAttendance(attendance)
    );
  } catch (error: any) {
    console.error(error);

    res.status(500).json({
      message: error.message,
    });
  }
};

export const updateAttendance = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    // Validate input
    const result = updateAttendanceSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.flatten(),
      });
    }

    const updateData: any = { ...result.data };

    // Convert epoch numbers to BigInt
    if (updateData.clockInTimestamp) {
      updateData.clockInTimestamp = BigInt(updateData.clockInTimestamp);
    }

    if (updateData.clockOutTimestamp) {
      updateData.clockOutTimestamp = BigInt(updateData.clockOutTimestamp);
    }

    // Auto-calculate totalHoursComputed if timestamps are involved
    if (updateData.clockInTimestamp || updateData.clockOutTimestamp) {
      // Fetch existing record to get the other timestamp if only one is provided
      const existingAttendance = await getAttendanceByIdService(
        BigInt(req.params.id)
      );

      if (!existingAttendance) {
        return res.status(404).json({
          message: "Attendance record not found",
        });
      }

      // Get clock-in and clock-out epoch times
      const clockInEpoch = updateData.clockInTimestamp || existingAttendance.clockInTimestamp;
      const clockOutEpoch = updateData.clockOutTimestamp || existingAttendance.clockOutTimestamp;

      // Calculate hours if both timestamps are available
      if (clockInEpoch && clockOutEpoch) {
        // Convert BigInt to number for calculation
        const clockInMs = Number(clockInEpoch);
        const clockOutMs = Number(clockOutEpoch);
        
        const diffInMs = clockOutMs - clockInMs;
        const diffInHours = diffInMs / (1000 * 60 * 60);
        
        // Round to 2 decimal places and ensure it's within reasonable bounds
        const calculatedHours = Math.max(0, Math.min(999.99, Math.round(diffInHours * 100) / 100));
        updateData.totalHoursComputed = calculatedHours;
      }
    }

    const attendance =
      await updateAttendanceService(
        BigInt(req.params.id),
        updateData
      );

    res.json(
      serializeAttendance(attendance)
    );
  } catch (error: any) {
    console.error("Update attendance error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

export const deleteAttendance = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    await deleteAttendanceService(
      BigInt(req.params.id)
    );

    res.json({
      message: "Attendance deleted successfully",
    });
  } catch (error: any) {
    console.error(error);

    res.status(500).json({
      message: error.message,
    });
  }
};