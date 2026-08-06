import prisma from "../prisma";

export const createAttendanceService = async (data: any) => {
  return prisma.attendance.create({ data });
};

export const getAttendanceService = async () => {
  return prisma.attendance.findMany({
    include: {
      employee: true,
    },
  });
};

export const getAttendanceByIdService = async (id: bigint) => {
  return prisma.attendance.findUnique({
    where: {
      attendanceId: id,
    },
    include: {
      employee: true,
    },
  });
};

export const updateAttendanceService = async (
  id: bigint,
  data: any
) => {
  return prisma.attendance.update({
    where: {
      attendanceId: id,
    },
    data,
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
    include: {
      employee: true,
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

  return prisma.attendance.findFirst({
    where: {
      employeeId: employeeId,
      calendarDate: {
        gte: todayStart,
        lte: todayEndMs,
      },
    },
    include: {
      employee: true,
    },
  });
};