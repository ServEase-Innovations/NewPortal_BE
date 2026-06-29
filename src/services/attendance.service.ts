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