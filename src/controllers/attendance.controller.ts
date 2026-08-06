import { Request, Response } from "express";
import {
  createAttendanceService,
  getAttendanceService,
  getAttendanceByIdService,
  updateAttendanceService,
  deleteAttendanceService,
  getAttendanceByEmployeeService,
  getTodayAttendanceService,
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

    // Fetch existing record first - needed for all update scenarios
    const existingAttendance = await getAttendanceByIdService(
      BigInt(req.params.id)
    );

    if (!existingAttendance) {
      return res.status(404).json({
        message: "Attendance record not found",
      });
    }

    const updateData: any = { ...result.data };

    // Convert epoch numbers to BigInt
    if (updateData.clockInTimestamp) {
      updateData.clockInTimestamp = BigInt(updateData.clockInTimestamp);
    }

    // Handle clockOutTimestamp - can be null (resume work), undefined (not provided), or a timestamp
    if (updateData.clockOutTimestamp === null) {
      // Explicitly setting to null to resume work
      updateData.clockOutTimestamp = null;
    } else if (updateData.clockOutTimestamp) {
      updateData.clockOutTimestamp = BigInt(updateData.clockOutTimestamp);
    }

    // CRITICAL: Calculate hours ONLY when stopping work (clockOut provided and not null)
    // This prevents double-counting and ensures accurate time tracking
    if (updateData.clockOutTimestamp && updateData.clockOutTimestamp !== null) {
      // Use the ACTUAL clock-in from the database (not client-provided)
      // This prevents using stale/wrong timestamps
      const clockInEpoch = existingAttendance.clockInTimestamp;
      const clockOutEpoch = updateData.clockOutTimestamp;

      if (!clockInEpoch) {
        return res.status(400).json({
          message: "Cannot clock out without a clock-in time",
        });
      }

      // Calculate THIS session's duration
      const clockInMs = Number(clockInEpoch);
      const clockOutMs = Number(clockOutEpoch);
      
      const diffInMs = clockOutMs - clockInMs;
      
      // Validate: clock-out must be after clock-in
      if (diffInMs < 0) {
        return res.status(400).json({
          message: "Clock-out time cannot be before clock-in time",
        });
      }
      
      // Validate: session must be reasonable (not more than 24 hours)
      if (diffInMs > 24 * 60 * 60 * 1000) {
        return res.status(400).json({
          message: "Session duration exceeds 24 hours",
        });
      }
      
      const sessionHours = diffInMs / (1000 * 60 * 60);
      
      // Get previous accumulated hours from DATABASE (NEVER trust client)
      const previousHours = Number(existingAttendance.totalHoursComputed) || 0;
      
      // Add current session hours to previous hours
      const totalHours = Math.round((previousHours + sessionHours) * 100) / 100;
      
      // Validate final total is reasonable (not more than 744 hours = 31 days * 24h)
      if (totalHours > 744) {
        return res.status(400).json({
          message: "Total hours exceeds maximum allowed (744 hours)",
        });
      }
      
      updateData.totalHoursComputed = totalHours;
      
      console.log(`⏸️ Stopping work - Session: ${sessionHours.toFixed(2)}h + Previous: ${previousHours.toFixed(2)}h = Total: ${totalHours.toFixed(2)}h`);
    }
    
    // If resuming work (clockOut = null), keep the previous accumulated hours
    // DON'T let client override totalHoursComputed when resuming
    if (updateData.clockOutTimestamp === null) {
      delete updateData.totalHoursComputed; // Prevent client from changing accumulated hours
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

// Get attendance records for a specific employee
export const getAttendanceByEmployee = async (
  req: Request<{ employeeId: string }>,
  res: Response
) => {
  try {
    const employeeId = BigInt(req.params.employeeId);
    const attendance = await getAttendanceByEmployeeService(employeeId);

    res.json(
      attendance.map((item: any) => serializeAttendance(item))
    );
  } catch (error: any) {
    console.error("Get attendance by employee error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

// Get today's attendance for a specific employee
export const getTodayAttendanceByEmployee = async (
  req: Request<{ employeeId: string }>,
  res: Response
) => {
  try {
    const employeeId = BigInt(req.params.employeeId);
    const attendance = await getTodayAttendanceService(employeeId);

    if (!attendance) {
      return res.status(404).json({
        message: "No attendance record found for today",
      });
    }

    res.json(serializeAttendance(attendance));
  } catch (error: any) {
    console.error("Get today attendance error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};