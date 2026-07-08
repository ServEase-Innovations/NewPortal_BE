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

export const generateUsername = (fullName: string): string => {
  const nameParts = fullName.trim().split(' ');
  if (nameParts.length === 1) {
    return nameParts[0].slice(0, 6).toLowerCase();
  }
  
  const lastName = nameParts[nameParts.length - 1];
  const firstName = nameParts[0];
  
  const lastNamePart = lastName.slice(0, 3).toLowerCase();
  const firstNamePart = firstName.slice(0, 3).toLowerCase();
  
  const username = `${lastNamePart}${firstNamePart}`;
  console.log('Generated username:', username, 'from fullName:', fullName);
  return username;
};