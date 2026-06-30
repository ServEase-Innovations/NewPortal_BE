import prisma from "../prisma";
import bcrypt from "bcrypt";
import { generateUsername } from "../utils/username";

export const createEmployeeService = async (data: any) => {
  const username = generateUsername(data.fullName);

  const existingUser = await prisma.employee.findUnique({
    where: {
      username,
    },
  });

  if (existingUser) {
    throw new Error("Username already exists");
  }

  const hashedPassword = await bcrypt.hash(
    data.password,
    10
  );

  return prisma.employee.create({
    data: {
      ...data,
      username,
      password: hashedPassword,
    },
  });
};

export const getEmployeesService = async () => {
  return prisma.employee.findMany({
    select: {
      employeeId: true,
      fullName: true,
      username: true,
      emailAddress: true,
      assignedRole: true,
      assignedDepartment: true,
      appraisalState: true,
      baseSalary: true,
      allowances: true,
      deductions: true,
      isActive: true,
      joinedAt: true,
      managerId: true,
      teamId: true,
    },
  });
};

export const getEmployeeByIdService = async (
  id: string
) => {
  return prisma.employee.findUnique({
    where: {
      employeeId: id,
    },
    select: {
      employeeId: true,
      fullName: true,
      username: true,
      emailAddress: true,
      assignedRole: true,
      assignedDepartment: true,
      appraisalState: true,
      baseSalary: true,
      allowances: true,
      deductions: true,
      isActive: true,
      joinedAt: true,
      managerId: true,
      teamId: true,
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

export const deleteEmployeeService = async (
  id: string
) => {
  return prisma.employee.delete({
    where: {
      employeeId: id,
    },
  });
};