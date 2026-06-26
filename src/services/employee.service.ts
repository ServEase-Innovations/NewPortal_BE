import prisma from "../prisma";

export const createEmployeeService = async (data: any) => {
  return prisma.employee.create({
    data,
  });
};

export const getEmployeesService = async () => {
  return prisma.employee.findMany();
};

export const getEmployeeByIdService = async (id: string) => {
  return prisma.employee.findUnique({
    where: {
      employeeId: id,
    },
  });
};

export const updateEmployeeService = async (
  id: string,
  data: any
) => {
  return prisma.employee.update({
    where: {
      employeeId: id,
    },
    data,
  });
};

export const deleteEmployeeService = async (id: string) => {
  return prisma.employee.delete({
    where: {
      employeeId: id,
    },
  });
};