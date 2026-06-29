// src/validations/auth.validation.ts
import { z } from 'zod';

export const registerEmployeeSchema = z.object({
  fullName: z.string().min(3, 'Full name must be at least 3 characters'),
  emailAddress: z.string().email('Invalid email address'),
  assignedRole: z.enum(['SuperAdmin', 'Manager', 'Developer', 'Marketing', 'CustomStaff', 'HR']),
  assignedDepartment: z.string().min(2, 'Department is required'),
  baseSalary: z.number().min(0, 'Salary cannot be negative'),
  allowances: z.number().min(0),
  deductions: z.number().min(0),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});