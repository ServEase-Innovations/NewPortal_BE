// src/utils/auth.utils.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { EmployeeRole } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production';

export const hashPassword = async (password: string): Promise<string> => {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);
    console.log('Password hashed successfully');
    return hashed;
  } catch (error) {
    console.error('Error hashing password:', error);
    throw error;
  }
};

export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  try {
    const result = await bcrypt.compare(password, hashedPassword);
    console.log('Password comparison result:', result);
    return result;
  } catch (error) {
    console.error('Error comparing password:', error);
    return false;
  }
};

export const generateAccessToken = (employeeId: string, role: EmployeeRole): string => {
  const payload = { employeeId, role };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
};

export const generateRefreshToken = (employeeId: string): string => {
  return jwt.sign({ employeeId }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

export const verifyAccessToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
};

export const verifyRefreshToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    console.error('Refresh token verification failed:', error);
    return null;
  }
};

export const generateUsername = async (prisma: any): Promise<string> => {
  // Get the highest employee ID
  const lastEmployee = await prisma.employee.findFirst({
    orderBy: {
      employeeId: 'desc'
    },
    select: {
      employeeId: true
    }
  });

  let nextId = 1;
  if (lastEmployee) {
    nextId = Number(lastEmployee.employeeId) + 1;
  }

  // Format as 6-digit string with leading zeros
  const username = nextId.toString().padStart(6, '0');
  console.log('Generated username (Employee ID):', username);
  return username;
};