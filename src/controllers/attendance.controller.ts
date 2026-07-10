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

      // Determine clock-in and clock-out times
      const clockInTime = updateData.clockInTimestamp 
        ? new Date(updateData.clockInTimestamp)
        : existingAttendance.clockInTimestamp 
          ? new Date(existingAttendance.clockInTimestamp)
          : null;

      const clockOutTime = updateData.clockOutTimestamp
        ? new Date(updateData.clockOutTimestamp)
        : existingAttendance.clockOutTimestamp
          ? new Date(existingAttendance.clockOutTimestamp)
          : null;

      // Calculate hours if both timestamps are available
      if (clockInTime && clockOutTime) {
        const diffInMs = clockOutTime.getTime() - clockInTime.getTime();
        const diffInHours = diffInMs / (1000 * 60 * 60);
        
        // Round to 2 decimal places and ensure it's positive
        updateData.totalHoursComputed = Math.max(0, Math.round(diffInHours * 100) / 100);
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