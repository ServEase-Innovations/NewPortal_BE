// src/services/auth.service.ts
import prisma from '../prisma';
import { hashPassword, comparePassword, generateAccessToken, generateRefreshToken, generateUsername } from '../utils/auth.utils';
import { EmployeeRole } from '@prisma/client';

interface RegisterData {
  fullName: string;
  emailAddress: string;
  assignedRole: EmployeeRole;
  assignedDepartment: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  password: string;
}

interface LoginData {
  username: string;
  password: string;
}

export const registerService = async (data: RegisterData) => {
  try {
    // Hash ONLY the password
    const hashedPassword = await hashPassword(data.password);
    
    // Generate username
    let username = generateUsername(data.fullName);
    
    // Check if username already exists
    let existingUser = await prisma.employee.findFirst({
      where: { username },
    });
    
    let attempts = 0;
    while (existingUser && attempts < 10) {
      attempts++;
      const randomSuffix = Math.floor(Math.random() * 10000);
      const modifiedFullName = `${data.fullName}${randomSuffix}`;
      username = generateUsername(modifiedFullName);
      existingUser = await prisma.employee.findFirst({
        where: { username },
      });
    }
    
    if (existingUser) {
      username = `${username}${Date.now().toString().slice(-6)}`;
    }
    
    // Create employee - Prisma will auto-generate employeeId (CUID)
    const employee = await prisma.employee.create({
      data: {
        fullName: data.fullName,
        emailAddress: data.emailAddress,
        assignedRole: data.assignedRole,
        assignedDepartment: data.assignedDepartment,
        baseSalary: data.baseSalary,
        allowances: data.allowances,
        deductions: data.deductions,
        username: username,
        password: hashedPassword, // Only password is hashed
      },
    });
    
    console.log('Employee registered successfully:', {
      id: employee.employeeId,
      username: employee.username,
      fullName: employee.fullName
    });
    
    return employee;
  } catch (error) {
    console.error('Registration service error:', error);
    throw error;
  }
};

export const loginService = async (data: LoginData) => {
  try {
    console.log('Login attempt for username:', data.username);
    
    // Find employee by username
    const employee = await prisma.employee.findFirst({
      where: { username: data.username },
    });

    if (!employee) {
      console.log('Employee not found with username:', data.username);
      throw new Error('Invalid username or password');
    }

    console.log('Employee found:', {
      id: employee.employeeId,
      username: employee.username,
      hasPassword: !!employee.password
    });

    if (!employee.isActive) {
      console.log('Employee account is inactive:', employee.employeeId);
      throw new Error('Account is deactivated');
    }

    // Compare password
    const isPasswordValid = await comparePassword(data.password, employee.password);
    console.log('Password validation result:', isPasswordValid);
    
    if (!isPasswordValid) {
      throw new Error('Invalid username or password');
    }

    // Generate tokens
    const accessToken = generateAccessToken(employee.employeeId, employee.assignedRole);
    const refreshToken = generateRefreshToken(employee.employeeId);

    // Update last login and refresh token
    await prisma.employee.update({
      where: { employeeId: employee.employeeId },
      data: {
        lastLogin: new Date(),
        refreshToken: refreshToken,
      },
    });

    return {
      employee: {
        employeeId: employee.employeeId,
        fullName: employee.fullName,
        username: employee.username,
        emailAddress: employee.emailAddress,
        assignedRole: employee.assignedRole,
        assignedDepartment: employee.assignedDepartment,
      },
      accessToken,
      refreshToken,
    };
  } catch (error) {
    console.error('Login service error:', error);
    throw error;
  }
};

export const refreshAccessTokenService = async (refreshToken: string) => {
  try {
    const employee = await prisma.employee.findFirst({
      where: { refreshToken },
    });

    if (!employee) {
      throw new Error('Invalid refresh token');
    }

    const accessToken = generateAccessToken(employee.employeeId, employee.assignedRole);
    const newRefreshToken = generateRefreshToken(employee.employeeId);

    await prisma.employee.update({
      where: { employeeId: employee.employeeId },
      data: {
        refreshToken: newRefreshToken,
      },
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  } catch (error) {
    console.error('Refresh token service error:', error);
    throw error;
  }
};

export const logoutService = async (employeeId: string) => {
  try {
    await prisma.employee.update({
      where: { employeeId },
      data: {
        refreshToken: null,
      },
    });
  } catch (error) {
    console.error('Logout service error:', error);
    throw error;
  }
};