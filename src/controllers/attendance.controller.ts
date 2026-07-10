import { Request, Response } from "express";
import {
  createAttendanceService,
  getAttendanceService,
  getAttendanceByIdService,
  updateAttendanceService,
  deleteAttendanceService,
} from "../services/attendance.service";

import { createAttendanceSchema, updateAttendanceSchema } from "../validations/attendance.validation";

const serializeAttendance = (attendance: any) => ({
  ...attendance,
  attendanceId: attendance.attendanceId.toString(),
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

    const attendance = await createAttendanceService(result.data);

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

      // Helper function to parse time from various formats
      const parseTime = (timeString: string | Date | null): Date | null => {
        if (!timeString) return null;
        
        const date = new Date(timeString);
        
        // Create a date object with today's date but the time from the input
        // This ensures we're comparing times on the same day
        const today = new Date();
        return new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
          date.getHours(),
          date.getMinutes(),
          date.getSeconds(),
          date.getMilliseconds()
        );
      };

      // Determine clock-in and clock-out times
      const clockInTime = updateData.clockInTimestamp 
        ? parseTime(updateData.clockInTimestamp)
        : parseTime(existingAttendance.clockInTimestamp);

      const clockOutTime = updateData.clockOutTimestamp
        ? parseTime(updateData.clockOutTimestamp)
        : parseTime(existingAttendance.clockOutTimestamp);

      // Calculate hours if both timestamps are available
      if (clockInTime && clockOutTime) {
        let diffInMs = clockOutTime.getTime() - clockInTime.getTime();
        
        // If clock out is "earlier" than clock in, assume it's the next day
        if (diffInMs < 0) {
          diffInMs += 24 * 60 * 60 * 1000; // Add 24 hours
        }
        
        const diffInHours = diffInMs / (1000 * 60 * 60);
        
        // Round to 2 decimal places and cap at 99.99 (database limit)
        const calculatedHours = Math.min(99.99, Math.max(0, Math.round(diffInHours * 100) / 100));
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