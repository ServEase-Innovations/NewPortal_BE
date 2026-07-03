import { z } from "zod";

export const createEmployeeSchema = z.object({
  fullName: z.string().min(3),

  emailAddress: z.email(),

  password: z.string().min(8),

  assignedRole: z.enum([
    "SuperAdmin",
    "Manager",
    "Developer",
    "Marketing",
    "CustomStaff",
  ]),

  assignedDepartment: z.string(),

  baseAddress: z.string(),

  workAddress: z.string(),

  baseSalary: z.number(),

  allowances: z.number(),

  deductions: z.number(),

  // Team ID is cuid string
  teamId: z.string().optional(),

  // Employee ID is integer
  managerId: z.number().int().optional(),
});