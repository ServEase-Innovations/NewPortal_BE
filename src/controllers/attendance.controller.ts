import { Request, Response } from "express";
import { AttendanceStatus } from "@prisma/client";
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

    const data = result.data;

    // Validate: If both clockIn and clockOut provided, they must be on the same calendar day
    if (data.clockInTimestamp && data.clockOutTimestamp) {
      const clockInDate = new Date(data.clockInTimestamp);
      const clockOutDate = new Date(data.clockOutTimestamp);
      
      const clockInDay = new Date(clockInDate.getFullYear(), clockInDate.getMonth(), clockInDate.getDate());
      const clockOutDay = new Date(clockOutDate.getFullYear(), clockOutDate.getMonth(), clockOutDate.getDate());
      
      if (clockOutDay.getTime() !== clockInDay.getTime()) {
        return res.status(400).json({
          message: "Clock-in and clock-out must be on the same calendar day. Work sessions cannot span multiple days."
        });
      }
    }

    // Prepare type-safe DTO - IGNORE client-provided totalHoursComputed
    const attendanceData = {
      employeeId: BigInt(data.employeeId),
      calendarDate: BigInt(data.calendarDate),
      shiftStatus: data.shiftStatus as AttendanceStatus,
      clockInTimestamp: data.clockInTimestamp ? BigInt(data.clockInTimestamp) : undefined,
      clockOutTimestamp: data.clockOutTimestamp ? BigInt(data.clockOutTimestamp) : undefined,
      // Server calculates totalHoursComputed if both timestamps provided
      totalHoursComputed: (data.clockInTimestamp && data.clockOutTimestamp) 
        ? (data.clockOutTimestamp - data.clockInTimestamp) / (1000 * 60 * 60)
        : undefined,
    };

    const attendance = await createAttendanceService(attendanceData);

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

// Helper: Validate clock times and calculate session duration
const validateAndCalculateHours = (
  clockInEpoch: bigint | null,
  clockOutEpoch: bigint,
  previousHours: number
): { success: boolean; error?: string; totalHours?: number } => {
  if (!clockInEpoch) {
    return { success: false, error: "Cannot clock out without a clock-in time" };
  }

  const clockInMs = Number(clockInEpoch);
  const clockOutMs = Number(clockOutEpoch);
  
  const diffInMs = clockOutMs - clockInMs;
  
  // Validate: clock-out must be after clock-in
  if (diffInMs < 0) {
    return { success: false, error: "Clock-out time cannot be before clock-in time" };
  }
  
  // Validate: session must be reasonable (not more than 24 hours)
  if (diffInMs > 24 * 60 * 60 * 1000) {
    return { success: false, error: "Session duration exceeds 24 hours" };
  }
  
  const sessionHours = diffInMs / (1000 * 60 * 60);
  const totalHours = Math.round((previousHours + sessionHours) * 100) / 100;
  
  // Validate final total is reasonable (not more than 744 hours = 31 days * 24h)
  if (totalHours > 744) {
    return { success: false, error: "Total hours exceeds maximum allowed (744 hours)" };
  }
  
  console.log(`⏸️ Stopping work - Session: ${sessionHours.toFixed(2)}h + Previous: ${previousHours.toFixed(2)}h = Total: ${totalHours.toFixed(2)}h`);
  
  return { success: true, totalHours };
};

// Helper: Validate clock-out time against clock-in
const validateClockOutTime = (
  clockOutTimestamp: bigint,
  clockInTimestamp: bigint | null
): { valid: boolean; error?: string } => {
  if (!clockInTimestamp) {
    return {
      valid: false,
      error: "Cannot set clock-out time without a clock-in time. Provide clockInTimestamp or ensure existing record has one."
    };
  }
  
  if (clockOutTimestamp <= clockInTimestamp) {
    return {
      valid: false,
      error: "Clock-out time must be after clock-in time"
    };
  }
  
  // NEW: Validate that clock-out is on the same calendar day as clock-in
  const clockInDate = new Date(Number(clockInTimestamp));
  const clockOutDate = new Date(Number(clockOutTimestamp));
  
  // Reset time parts to compare only dates
  const clockInDay = new Date(clockInDate.getFullYear(), clockInDate.getMonth(), clockInDate.getDate());
  const clockOutDay = new Date(clockOutDate.getFullYear(), clockOutDate.getMonth(), clockOutDate.getDate());
  
  if (clockOutDay.getTime() !== clockInDay.getTime()) {
    return {
      valid: false,
      error: "Clock-out must be on the same calendar day as clock-in. Work sessions cannot span multiple days."
    };
  }
  
  return { valid: true };
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

    const data = result.data;

    // Prepare type-safe update DTO
    const updateData: {
      shiftStatus?: AttendanceStatus;
      clockInTimestamp?: bigint | null;
      clockOutTimestamp?: bigint | null;
      totalHoursComputed?: number;
    } = {};

    if (data.shiftStatus) {
      updateData.shiftStatus = data.shiftStatus as AttendanceStatus;
    }

    // Convert epoch numbers to BigInt
    if (data.clockInTimestamp) {
      updateData.clockInTimestamp = BigInt(data.clockInTimestamp);
    }

    // Handle clockOutTimestamp - can be null (resume work), undefined (not provided), or a timestamp
    if (data.clockOutTimestamp === null) {
      // Explicitly setting to null to resume work
      updateData.clockOutTimestamp = null;
    } else if (data.clockOutTimestamp) {
      updateData.clockOutTimestamp = BigInt(data.clockOutTimestamp);
      
      // VALIDATION: If providing clockOut, must have clockIn
      const effectiveClockIn = updateData.clockInTimestamp || existingAttendance.clockInTimestamp;
      const validation = validateClockOutTime(updateData.clockOutTimestamp, effectiveClockIn);
      
      if (!validation.valid) {
        return res.status(400).json({ message: validation.error });
      }
    }

    // CRITICAL: Calculate hours ONLY when stopping work (clockOut provided and not null)
    if (updateData.clockOutTimestamp && updateData.clockOutTimestamp !== null) {
      const previousHours = Number(existingAttendance.totalHoursComputed) || 0;
      
      const calculation = validateAndCalculateHours(
        existingAttendance.clockInTimestamp,
        updateData.clockOutTimestamp,
        previousHours
      );
      
      if (!calculation.success) {
        return res.status(400).json({ message: calculation.error });
      }
      
      updateData.totalHoursComputed = calculation.totalHours;
    }
    
    // If resuming work (clockOut = null), keep the previous accumulated hours
    if (updateData.clockOutTimestamp === null) {
      delete updateData.totalHoursComputed;
    }

    const attendance = await updateAttendanceService(
      BigInt(req.params.id),
      updateData
    );

    res.json(serializeAttendance(attendance));
  } catch (error: any) {
    console.error("Update attendance error:", error);
    res.status(500).json({ message: error.message });
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