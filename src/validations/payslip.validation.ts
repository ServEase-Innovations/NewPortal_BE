import { z } from "zod";

const positiveIntegerId = z
  .string()
  .regex(/^\d+$/, "Employee ID must be a positive integer")
  .refine((value) => BigInt(value) > 0n, "Employee ID must be greater than zero");

const moneyValue = z.union([
  z.number().finite().min(0),
  z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Use a non-negative amount with at most two decimal places"),
]);

const dayValue = z.union([
  z.number().finite().min(0).max(366),
  z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Use a valid non-negative day value"),
]);

const earningSchema = z.object({
  earningType: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).nullable().optional(),
  amount: moneyValue,
  isTaxable: z.boolean().optional().default(true),
});

const deductionSchema = z.object({
  deductionType: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).nullable().optional(),
  amount: moneyValue,
});

export const createPayrollRunSchema = z.object({
  payrollMonth: z.number().int().min(1).max(12),
  payrollYear: z.number().int().min(2000).max(2200),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).optional().default("INR"),
});

export const generatePayslipsSchema = z.object({
  employeeIds: z.array(positiveIntegerId).max(500).optional(),
});

export const payrollRunListQuerySchema = z.object({
  year: z.string().regex(/^\d{4}$/, "Year must contain four digits").optional(),
  status: z.enum(["Draft", "Processing", "Approved", "Paid", "Cancelled"]).optional(),
});

export const payslipListQuerySchema = z.object({
  employeeId: positiveIntegerId.optional(),
  month: z.string().regex(/^(?:[1-9]|1[0-2])$/, "Month must be between 1 and 12").optional(),
  year: z.string().regex(/^\d{4}$/, "Year must contain four digits").optional(),
  status: z.enum(["Draft", "Approved", "Paid", "Cancelled"]).optional(),
});

export const updatePayslipSchema = z
  .object({
    workingDays: dayValue.optional(),
    payableDays: dayValue.optional(),
    unpaidLeaveDays: dayValue.optional(),
    bankAccountMasked: z.string().trim().min(4).max(50).nullable().optional(),
    earnings: z.array(earningSchema).max(50).optional(),
    deductions: z.array(deductionSchema).max(50).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one payslip field to update",
  });

export const markPayrollPaidSchema = z.object({
  paymentReference: z.string().trim().min(1).max(200).optional(),
});

export type CreatePayrollRunInput = z.infer<typeof createPayrollRunSchema>;
export type GeneratePayslipsInput = z.infer<typeof generatePayslipsSchema>;
export type UpdatePayslipInput = z.infer<typeof updatePayslipSchema>;
