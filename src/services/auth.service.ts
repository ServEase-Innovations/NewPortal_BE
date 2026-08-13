import prisma from "../prisma";
import bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";

// Get access token expiration time from environment or use secure default
const getAccessTokenExpiresIn = (): string => {
  const configuredTime = process.env.JWT_ACCESS_TOKEN_EXPIRES_IN;
  
  if (configuredTime) {
    return configuredTime;
  }
  
  // Default to 15 minutes for better security
  // This is short enough to minimize risk if compromised,
  // but long enough to provide good UX with refresh token rotation
  return "15m";
};

// Helper to format employee data for API response
export const formatEmployeeData = (employee: any) => ({
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
});

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

  // Generate access token with configurable expiry (default 15m)
  const token = jwt.sign(
    {
      employeeId: employee.employeeId.toString(),
      username: employee.username,
      emailAddress: employee.emailAddress,
      assignedRole: employee.assignedRole,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: (process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || "15m") as any }
  );

  return {
    token,
    employee: formatEmployeeData(employee),
  };
};

export const generateRefreshToken = (employeeId: string) => {
  // Ensure refresh token uses a different secret - fail fast if not set
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET environment variable is required');
  }
  
  return jwt.sign(
    { employeeId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" } // Long-lived refresh token
  );
};

export const refreshTokenService = async (refreshToken: string) => {
  try {
    // Verify refresh token
    if (!process.env.JWT_REFRESH_SECRET) {
      throw new Error('JWT_REFRESH_SECRET environment variable is required');
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET) as any;
    
    // Validate token type
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    // Check if employee still exists and is active
    const employee = await prisma.employee.findUnique({
      where: { employeeId: parseInt(decoded.employeeId) }
    });

    if (!employee || !employee.isActive) {
      throw new Error('Employee not found or inactive');
    }

    // Generate new access token with configurable expiry (default 15m)
    const newAccessToken = jwt.sign(
      {
        employeeId: employee.employeeId.toString(),
        username: employee.username,
        emailAddress: employee.emailAddress,
        assignedRole: employee.assignedRole,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: (process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || "15m") as any }
    );

    // Generate new refresh token (token rotation for security)
    const newRefreshToken = generateRefreshToken(employee.employeeId.toString());

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      employee: formatEmployeeData(employee),
    };
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
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
