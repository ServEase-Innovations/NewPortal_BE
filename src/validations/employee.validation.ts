import { z } from "zod";

export const createEmployeeSchema = z.object({
  fullName: z
    .string()
    .min(3, "Full name must be at least 3 characters"),

  emailAddress: z
    .email("Invalid email address"),

  assignedRole: z.enum([
    "SuperAdmin",
    "Manager",
    "Developer",
    "Marketing",
    "CustomStaff",
  ]),

  assignedDepartment: z
    .string()
    .min(2, "Department is required"),

  baseSalary: z
    .number()
    .min(0, "Salary cannot be negative"),

  allowances: z
    .number()
    .min(0),

  deductions: z
    .number()
    .min(0),
});