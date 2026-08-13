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
  
  // Update last_login with current epoch timestamp
  await prisma.employee.update({
    where: { employeeId: employee.employeeId },
    data: { last_login: BigInt(Date.now()) },
  });

  const token = jwt.sign(
    {
      employeeId: employee.employeeId.toString(),
      username: employee.username,
      emailAddress: employee.emailAddress,
      assignedRole: employee.assignedRole,
    },
    process.env.JWT_SECRET as string,
    {
      expiresIn: "24h", // Short-lived access token
    }
  );

  return {
    token,
    employee: {
      employeeId: employee.employeeId.toString(),
      fullName: employee.fullName,
      username: employee.username,
      emailAddress: employee.emailAddress,
      assignedRole: employee.assignedRole,
      assignedDepartment: employee.assignedDepartment,
      isActive: employee.isActive,
      baseSalary: employee.baseSalary ? Number(employee.baseSalary) : undefined,
      allowances: employee.allowances ? Number(employee.allowances) : undefined,
      deductions: employee.deductions ? Number(employee.deductions) : undefined,
      joinedAt: employee.joinedAt ? employee.joinedAt.toString() : undefined,
      lastLogin: employee.last_login ? employee.last_login.toString() : undefined,
      managerId: employee.managerId ? employee.managerId.toString() : undefined,
      teamId: employee.teamId ? employee.teamId : undefined,
    },
  };
};

export const generateRefreshToken = (employeeId: string) => {
  return jwt.sign(
    { employeeId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET as string,
    { expiresIn: "7d" } // Long-lived refresh token
  );
};

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET as string);
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
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
  // Generate username: first 3 chars of first name + first 3 chars of last name
  const generateUsername = (fullName: string): string => {
    const nameParts = fullName.trim().split(' ').filter(Boolean);
    
    if (nameParts.length === 0) {
      throw new Error('Invalid full name');
    }
    
    // Get first name (first part) and last name (last part)
    const firstName = nameParts[0].toLowerCase();
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1].toLowerCase() : '';
    
    // Take first 3 characters of each (or less if name is shorter)
    const firstPart = firstName.substring(0, 3);
    const lastPart = lastName.substring(0, 3);
    
    // Combine: first3chars + last3chars
    return `${firstPart}${lastPart}`;
  };

  const username = generateUsername(data.fullName);

  // Hash password
  const hashedPassword = await bcrypt.hash(data.password, 10);

  // Create employee with epoch timestamp for joinedAt
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
      joinedAt: BigInt(Date.now()),
    },
  });

  return employee;
};
