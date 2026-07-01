// src/validations/employee.validation.ts
import { z } from 'zod';

export const createEmployeeSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters"),
  emailAddress: z.string().email("Invalid email address"),
  assignedRole: z.enum([
    "SuperAdmin",
    "Manager",
    "Developer",
    "Marketing",
    "CustomStaff",
    "HR",
  ]),
  assignedDepartment: z.string().min(2, "Department is required"),
  baseSalary: z.number().min(0, "Salary cannot be negative").optional(),
  allowances: z.number().min(0).optional(),
  deductions: z.number().min(0).optional(),
  username: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
});