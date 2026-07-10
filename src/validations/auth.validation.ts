import { z } from "zod";
import { EmployeeRole } from "@prisma/client";

export const loginSchema = z.object({
  username: z.string(),
  password: z.string().min(6),
});

export const registerEmployeeSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  emailAddress: z.string().email("Invalid email address"),
  assignedRole: z.nativeEnum(EmployeeRole, {
  error: "Invalid role",
}),
  assignedDepartment: z.string().min(2, "Department must be at least 2 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
  baseSalary: z.coerce.number().optional().default(0),
  allowances: z.coerce.number().optional().default(0),
  deductions: z.coerce.number().optional().default(0),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});