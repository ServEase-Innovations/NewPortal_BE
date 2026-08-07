import prisma from "../prisma";
import { Prisma, AttendanceStatus } from "@prisma/client";

// Type-safe DTOs for attendance operations
type CreateAttendanceDTO = {
  employeeId: bigint;
  calendarDate: bigint;
  shiftStatus: AttendanceStatus;
  clockInTimestamp?: bigint | null;
  clockOutTimestamp?: bigint | null;
  totalHoursComputed?: number;
};

type UpdateAttendanceDTO = {
  shiftStatus?: AttendanceStatus;
  clockInTimestamp?: bigint | null;
  clockOutTimestamp?: bigint | null;
  totalHoursComputed?: number;
};

// Whitelisted employee fields for safe inclusion
// Based on actual Prisma schema - excludes sensitive fields like password, refresh_token, last_login
const safeEmployeeSelect = {
  employeeId: true,
  username: true,
  fullName: true,
  emailAddress: true,
  assignedRole: true,
  assignedDepartment: true,
  isActive: true,
  joinedAt: true,
  managerId: true,
  teamId: true,
  // Exclude sensitive fields: password, refresh_token, last_login, privateAdminNotes
};

export const createAttendanceService = async (data: CreateAttendanceDTO) => {
  // Explicitly whitelist fields to prevent mass assignment vulnerabilities
  const whitelistedData: Prisma.AttendanceUncheckedCreateInput = {
    employeeId: data.employeeId,
    calendarDate: data.calendarDate,
    shiftStatus: data.shiftStatus,
    clockInTimestamp: data.clockInTimestamp,
    clockOutTimestamp: data.clockOutTimestamp,
    totalHoursComputed: data.totalHoursComputed,
  };

  return prisma.attendance.create({ 
    data: whitelistedData,
    select: {
      attendanceId: true,
      employeeId: true,
      calendarDate: true,
      shiftStatus: true,
      clockInTimestamp: true,
      clockOutTimestamp: true,
      totalHoursComputed: true,
      employee: {
        select: safeEmployeeSelect,
      },
    },
  });
};

export const getAttendanceService = async () => {
  return prisma.attendance.findMany({
    select: {
      attendanceId: true,
      employeeId: true,
      calendarDate: true,
      shiftStatus: true,
      clockInTimestamp: true,
      clockOutTimestamp: true,
      totalHoursComputed: true,
      employee: {
        select: safeEmployeeSelect,
      },
    },
  });
};

export const getAttendanceByIdService = async (id: bigint) => {
  return prisma.attendance.findUnique({
    where: {
      attendanceId: id,
    },
    select: {
      attendanceId: true,
      employeeId: true,
      calendarDate: true,
      shiftStatus: true,
      clockInTimestamp: true,
      clockOutTimestamp: true,
      totalHoursComputed: true,
      employee: {
        select: safeEmployeeSelect,
      },
    },
  });
};

export const updateAttendanceService = async (
  id: bigint,
  data: UpdateAttendanceDTO
) => {
  // Explicitly whitelist updatable fields to prevent mass assignment
  const whitelistedData: Prisma.AttendanceUncheckedUpdateInput = {};
  
  if (data.shiftStatus !== undefined) {
    whitelistedData.shiftStatus = data.shiftStatus;
  }
  if (data.clockInTimestamp !== undefined) {
    whitelistedData.clockInTimestamp = data.clockInTimestamp;
  }
  if (data.clockOutTimestamp !== undefined) {
    whitelistedData.clockOutTimestamp = data.clockOutTimestamp;
  }
  if (data.totalHoursComputed !== undefined) {
    whitelistedData.totalHoursComputed = data.totalHoursComputed;
  }

  return prisma.attendance.update({
    where: {
      attendanceId: id,
    },
    data: whitelistedData,
    select: {
      attendanceId: true,
      employeeId: true,
      calendarDate: true,
      shiftStatus: true,
      clockInTimestamp: true,
      clockOutTimestamp: true,
      totalHoursComputed: true,
      employee: {
        select: safeEmployeeSelect,
      },
    },
  });
};

export const deleteAttendanceService = async (id: bigint) => {
  return prisma.attendance.delete({
    where: {
      attendanceId: id,
    },
  });
};

// Get attendance records for a specific employee
export const getAttendanceByEmployeeService = async (employeeId: bigint) => {
  return prisma.attendance.findMany({
    where: {
      employeeId: employeeId,
    },
    select: {
      attendanceId: true,
      employeeId: true,
      calendarDate: true,
      shiftStatus: true,
      clockInTimestamp: true,
      clockOutTimestamp: true,
      totalHoursComputed: true,
      employee: {
        select: safeEmployeeSelect,
      },
    },
    orderBy: {
      calendarDate: 'desc',
    },
  });
};

// Get today's attendance for a specific employee
export const getTodayAttendanceService = async (employeeId: bigint) => {
  // Get today's date boundaries in epoch milliseconds
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = BigInt(today.getTime());
  
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const todayEndMs = BigInt(todayEnd.getTime());

  // First, check for any unclosed attendance from previous days and auto-close them
  await autoClosePreviousDayAttendance(employeeId, todayStart);

  return prisma.attendance.findFirst({
    where: {
      employeeId: employeeId,
      calendarDate: {
        gte: todayStart,
        lte: todayEndMs,
      },
    },
    select: {
      attendanceId: true,
      employeeId: true,
      calendarDate: true,
      shiftStatus: true,
      clockInTimestamp: true,
      clockOutTimestamp: true,
      totalHoursComputed: true,
      employee: {
        select: safeEmployeeSelect,
      },
    },
    orderBy: {
      calendarDate: 'desc', // Deterministic ordering - most recent first
    },
  });
};

// Auto-close any attendance records from previous days that are still open
export const autoClosePreviousDayAttendance = async (
  employeeId: bigint,
  currentDayStart: bigint
) => {
  try {
    // Find all open attendance records (no clockOutTimestamp) from before today
    const openRecords = await prisma.attendance.findMany({
      where: {
        employeeId: employeeId,
        clockInTimestamp: { not: null },
        clockOutTimestamp: null,
        calendarDate: { lt: currentDayStart },
      },
    });

    if (openRecords.length === 0) {
      return;
    }

    console.log(`🔄 Auto-closing ${openRecords.length} previous day attendance record(s) for employee ${employeeId}`);

    // Close each record at 11:59:59 PM of that day
    for (const record of openRecords) {
      const recordDate = new Date(Number(record.calendarDate));
      recordDate.setHours(23, 59, 59, 999); // End of that day
      const dayEndTimestamp = BigInt(recordDate.getTime());

      // Calculate hours for that session
      const clockInMs = Number(record.clockInTimestamp);
      const clockOutMs = Number(dayEndTimestamp);
      const sessionHours = (clockOutMs - clockInMs) / (1000 * 60 * 60);
      const previousHours = Number(record.totalHoursComputed) || 0;
      const totalHours = Math.round((previousHours + sessionHours) * 100) / 100;

      await prisma.attendance.update({
        where: { attendanceId: record.attendanceId },
        data: {
          clockOutTimestamp: dayEndTimestamp,
          totalHoursComputed: totalHours,
        },
      });

      console.log(`✅ Auto-closed attendance ID ${record.attendanceId} at ${recordDate.toISOString()} with ${totalHours}h total`);
    }
  } catch (error) {
    console.error('Error auto-closing previous day attendance:', error);
    // Don't throw - allow the main query to continue even if auto-close fails
  }
};