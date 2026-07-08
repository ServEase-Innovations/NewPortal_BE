import prisma from "../prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const loginService = async (
  username: string,
  password: string
) => {
  const employee = await prisma.employee.findUnique({
    where: {
      username,
    },
  });

  if (!employee) {
    throw new Error("Invalid username or password");
  }

  const isPasswordCorrect = await bcrypt.compare(
    password,
    employee.password
  );

  if (!isPasswordCorrect) {
    throw new Error("Invalid username or password");
  }
  

 const token = jwt.sign(
  {
    employeeId: employee.employeeId,
    username: employee.username,
    role: employee.assignedRole,
  },
  process.env.JWT_SECRET as string,
  {
    expiresIn: "1d",
  }
);

  return {
    token,
    employee: {
      employeeId: employee.employeeId,
      fullName: employee.fullName,
      username: employee.username,
      emailAddress: employee.emailAddress,
      assignedRole: employee.assignedRole,
    },
  };
};


export const registerService = async (data: {
  fullName: string;
  emailAddress: string;
  assignedRole: string;
  assignedDepartment: string;
  password: string;
  baseSalary?: number;
  allowances?: number;
  deductions?: number;
}) => {
  // Generate username from full name
  const generateUsername = (fullName: string): string => {
    const nameParts = fullName.toLowerCase().split(' ').filter(Boolean);
    const baseUsername = nameParts.join('.');
    const randomSuffix = Math.floor(Math.random() * 1000);
    return `${baseUsername}${randomSuffix}`;
  };

  const username = generateUsername(data.fullName);

  // Hash password
  const hashedPassword = await bcrypt.hash(data.password, 10);

  // Create employee
  const employee = await prisma.employee.create({
    data: {
      fullName: data.fullName,
      emailAddress: data.emailAddress,
      username: username,
      password: hashedPassword,
      assignedRole: data.assignedRole as any,
      assignedDepartment: data.assignedDepartment,
      baseSalary: data.baseSalary || 0,
      allowances: data.allowances || 0,
      deductions: data.deductions || 0,
    },
  });

  return employee;
};
