import { PayslipStatus } from "@prisma/client";
import { Response } from "express";

import { AuthRequest } from "../middleware/auth.middleware";
import { createPayslipPdfBuffer } from "../services/payslip-pdf.service";
import {
  approvePayrollRunService,
  createPayrollRunService,
  generatePayslipForEmployeeService,
  generatePayslipsService,
  getPayrollRunByIdService,
  getPayrollRunsService,
  getPayslipByEmployeePeriodService,
  getPayslipsService,
  markPayrollRunPaidService,
  PayrollDomainError,
  updateDraftPayslipByEmployeeService,
} from "../services/payslip.service";
import {
  createPayrollRunSchema,
  employeePayslipPeriodSchema,
  employeePayslipQuerySchema,
  generatePayslipForEmployeeSchema,
  generatePayslipsSchema,
  markPayrollPaidSchema,
  payrollRunListQuerySchema,
  payslipListQuerySchema,
  updatePayslipSchema,
} from "../validations/payslip.validation";
import { currentDateOnly, epochDayToDateOnly, epochToIso, nowEpoch } from "../utils/epoch";

// SuperAdmin and Manager have full access to every payslip/payroll workflow
// (generation, approval, mark-paid, editing, viewing all employees) and may
// generate payslips as many times as needed.
const payrollAdminRoles = new Set(["SuperAdmin", "Manager"]);

// Developer, Marketing, CustomStaff and HR can only view/download their own
// payslips, and only for the current or previous calendar month.
const employeeVisibleStatuses: PayslipStatus[] = [
  PayslipStatus.Approved,
  PayslipStatus.Paid,
];

const isPayrollAdmin = (req: AuthRequest): boolean =>
  Boolean(req.employee && payrollAdminRoles.has(req.employee.assignedRole));

const isOwner = (req: AuthRequest, employeeId: bigint): boolean =>
  req.employee?.employeeId === employeeId.toString();

const parsePositiveBigInt = (value: unknown): bigint | null => {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const parsed = BigInt(value);
  return parsed > 0n ? parsed : null;
};

/**
 * Restricted roles may only ever see the current or previous calendar
 * month's payslip. Admin roles are not subject to this check.
 */
const isCurrentOrPreviousPeriod = (month: number, year: number): boolean => {
  const [currentYearStr, currentMonthStr] = currentDateOnly().split("-");
  const currentYear = Number(currentYearStr);
  const currentMonth = Number(currentMonthStr);

  const requestedIndex = year * 12 + (month - 1);
  const currentIndex = currentYear * 12 + (currentMonth - 1);

  return currentIndex - requestedIndex >= 0 && currentIndex - requestedIndex <= 1;
};

const serializeEmployeeSummary = (employee: any) =>
  employee
    ? {
        ...employee,
        employeeId: employee.employeeId.toString(),
        managerId:
          employee.managerId === null || employee.managerId === undefined
            ? undefined
            : employee.managerId.toString(),
      }
    : undefined;

export const serializePayslip = (payslip: any) => ({
  payslipId: payslip.payslipId.toString(),
  payrollRunId: payslip.payrollRunId.toString(),
  employeeId: payslip.employeeId.toString(),
  payslipNumber: payslip.payslipNumber,
  employeeNameSnapshot: payslip.employeeNameSnapshot,
  employeeEmailSnapshot: payslip.employeeEmailSnapshot,
  employeeRoleSnapshot: payslip.employeeRoleSnapshot,
  employeeDepartmentSnapshot: payslip.employeeDepartmentSnapshot,
  bankAccountMasked: payslip.bankAccountMasked,
  currency: payslip.currency,
  workingDays: payslip.workingDays.toString(),
  payableDays: payslip.payableDays.toString(),
  unpaidLeaveDays: payslip.unpaidLeaveDays.toString(),
  baseSalarySnapshot: payslip.baseSalarySnapshot.toFixed(2),
  allowanceSnapshot: payslip.allowanceSnapshot.toFixed(2),
  deductionSnapshot: payslip.deductionSnapshot.toFixed(2),
  totalEarnings: payslip.totalEarnings.toFixed(2),
  totalDeductions: payslip.totalDeductions.toFixed(2),
  netSalary: payslip.netSalary.toFixed(2),
  status: payslip.status,
  generatedAt: epochToIso(payslip.generatedAt),
  generatedAtEpoch: payslip.generatedAt.toString(),
  updatedAt: epochToIso(payslip.updatedAt),
  updatedAtEpoch: payslip.updatedAt.toString(),
  approvedAt: payslip.approvedAt ? epochToIso(payslip.approvedAt) : null,
  approvedAtEpoch: payslip.approvedAt?.toString() ?? null,
  paidAt: payslip.paidAt ? epochToIso(payslip.paidAt) : null,
  paidAtEpoch: payslip.paidAt?.toString() ?? null,
  paymentReference: payslip.paymentReference,
  pdfUrl: payslip.pdfUrl,
  employee: serializeEmployeeSummary(payslip.employee),
  payrollRun: payslip.payrollRun
    ? {
        ...payslip.payrollRun,
        payrollRunId: payslip.payrollRun.payrollRunId.toString(),
        periodStart: epochDayToDateOnly(payslip.payrollRun.periodStart),
        periodEnd: epochDayToDateOnly(payslip.payrollRun.periodEnd),
      }
    : undefined,
  earnings: (payslip.earnings || []).map((earning: any) => ({
    payslipEarningId: earning.payslipEarningId.toString(),
    earningType: earning.earningType,
    description: earning.description,
    amount: earning.amount.toFixed(2),
    isTaxable: earning.isTaxable,
    createdAt: epochToIso(earning.createdAt),
    createdAtEpoch: earning.createdAt.toString(),
  })),
  deductions: (payslip.deductions || []).map((deduction: any) => ({
    payslipDeductionId: deduction.payslipDeductionId.toString(),
    deductionType: deduction.deductionType,
    description: deduction.description,
    amount: deduction.amount.toFixed(2),
    createdAt: epochToIso(deduction.createdAt),
    createdAtEpoch: deduction.createdAt.toString(),
  })),
  auditLogs: (payslip.auditLogs || []).map((audit: any) => ({
    payslipAuditLogId: audit.payslipAuditLogId.toString(),
    action: audit.action,
    performedById: audit.performedById.toString(),
    previousData: audit.previousData,
    updatedData: audit.updatedData,
    createdAt: epochToIso(audit.createdAt),
    createdAtEpoch: audit.createdAt.toString(),
    performedBy: serializeEmployeeSummary(audit.performedBy),
  })),
});

const serializePayrollRun = (payrollRun: any) => ({
  payrollRunId: payrollRun.payrollRunId.toString(),
  payrollMonth: payrollRun.payrollMonth,
  payrollYear: payrollRun.payrollYear,
  periodStart: epochDayToDateOnly(payrollRun.periodStart),
  periodStartEpoch: payrollRun.periodStart.toString(),
  periodEnd: epochDayToDateOnly(payrollRun.periodEnd),
  periodEndEpoch: payrollRun.periodEnd.toString(),
  currency: payrollRun.currency,
  status: payrollRun.status,
  createdById: payrollRun.createdById.toString(),
  approvedById: payrollRun.approvedById?.toString() ?? null,
  approvedAt: payrollRun.approvedAt ? epochToIso(payrollRun.approvedAt) : null,
  approvedAtEpoch: payrollRun.approvedAt?.toString() ?? null,
  paidAt: payrollRun.paidAt ? epochToIso(payrollRun.paidAt) : null,
  paidAtEpoch: payrollRun.paidAt?.toString() ?? null,
  createdAt: epochToIso(payrollRun.createdAt),
  createdAtEpoch: payrollRun.createdAt.toString(),
  updatedAt: epochToIso(payrollRun.updatedAt),
  updatedAtEpoch: payrollRun.updatedAt.toString(),
  createdBy: serializeEmployeeSummary(payrollRun.createdBy),
  approvedBy: serializeEmployeeSummary(payrollRun.approvedBy),
  payslipCount: payrollRun._count?.payslips ?? payrollRun.payslips?.length ?? 0,
  payslips: payrollRun.payslips?.map(serializePayslip),
});

const sendError = (res: Response, error: unknown, fallbackMessage: string) => {
  if (error instanceof PayrollDomainError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  const prismaError = error as { code?: string };
  if (prismaError?.code === "P2002") {
    return res.status(409).json({
      message: "A payroll run already exists for this month and year",
    });
  }
  if (prismaError?.code === "P2003") {
    return res.status(404).json({ message: "Referenced employee not found" });
  }

  const details = error instanceof Error ? error.message : String(error);
  console.error(fallbackMessage, details);
  return res.status(500).json({
    message: fallbackMessage,
    error: process.env.NODE_ENV === "development" ? details : undefined,
  });
};

export const createPayrollRun = async (req: AuthRequest, res: Response) => {
  if (!req.employee) return res.status(401).json({ message: "Authentication required" });

  const result = createPayrollRunSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: "Validation failed", errors: result.error.flatten() });
  }

  try {
    const payrollRun = await createPayrollRunService({
      ...result.data,
      createdById: BigInt(req.employee.employeeId),
      timestamp: nowEpoch(),
    });
    return res.status(201).json({
      message: "Payroll run created successfully",
      payrollRun: serializePayrollRun(payrollRun),
    });
  } catch (error) {
    return sendError(res, error, "Failed to create payroll run");
  }
};

export const getPayrollRuns = async (req: AuthRequest, res: Response) => {
  const result = payrollRunListQuerySchema.safeParse(req.query);
  if (!result.success) {
    return res.status(400).json({ message: "Validation failed", errors: result.error.flatten() });
  }

  try {
    const payrollRuns = await getPayrollRunsService({
      year: result.data.year ? Number(result.data.year) : undefined,
      status: result.data.status,
    });
    return res.json({ count: payrollRuns.length, payrollRuns: payrollRuns.map(serializePayrollRun) });
  } catch (error) {
    return sendError(res, error, "Failed to fetch payroll runs");
  }
};

export const getPayrollRunById = async (req: AuthRequest, res: Response) => {
  const payrollRunId = parsePositiveBigInt(req.params.id);
  if (!payrollRunId) return res.status(400).json({ message: "Invalid payroll run ID" });

  try {
    const payrollRun = await getPayrollRunByIdService(payrollRunId);
    if (!payrollRun) return res.status(404).json({ message: "Payroll run not found" });
    return res.json({ payrollRun: serializePayrollRun(payrollRun) });
  } catch (error) {
    return sendError(res, error, "Failed to fetch payroll run");
  }
};

export const generatePayslips = async (req: AuthRequest, res: Response) => {
  if (!req.employee) return res.status(401).json({ message: "Authentication required" });
  const payrollRunId = parsePositiveBigInt(req.params.id);
  if (!payrollRunId) return res.status(400).json({ message: "Invalid payroll run ID" });

  const result = generatePayslipsSchema.safeParse(req.body || {});
  if (!result.success) {
    return res.status(400).json({ message: "Validation failed", errors: result.error.flatten() });
  }

  try {
    const payrollRun = await generatePayslipsService({
      payrollRunId,
      employeeIds: result.data.employeeIds?.map(BigInt),
      performedById: BigInt(req.employee.employeeId),
      timestamp: nowEpoch(),
    });
    return res.status(201).json({
      message: "Payslips generated successfully",
      payrollRun: serializePayrollRun(payrollRun),
    });
  } catch (error) {
    return sendError(res, error, "Failed to generate payslips");
  }
};

export const approvePayrollRun = async (req: AuthRequest, res: Response) => {
  if (!req.employee) return res.status(401).json({ message: "Authentication required" });
  const payrollRunId = parsePositiveBigInt(req.params.id);
  if (!payrollRunId) return res.status(400).json({ message: "Invalid payroll run ID" });

  try {
    const payrollRun = await approvePayrollRunService({
      payrollRunId,
      approvedById: BigInt(req.employee.employeeId),
      timestamp: nowEpoch(),
    });
    return res.json({
      message: "Payroll run and payslips approved successfully",
      payrollRun: serializePayrollRun(payrollRun),
    });
  } catch (error) {
    return sendError(res, error, "Failed to approve payroll run");
  }
};

export const markPayrollRunPaid = async (req: AuthRequest, res: Response) => {
  if (!req.employee) return res.status(401).json({ message: "Authentication required" });
  const payrollRunId = parsePositiveBigInt(req.params.id);
  if (!payrollRunId) return res.status(400).json({ message: "Invalid payroll run ID" });

  const result = markPayrollPaidSchema.safeParse(req.body || {});
  if (!result.success) {
    return res.status(400).json({ message: "Validation failed", errors: result.error.flatten() });
  }

  try {
    const payrollRun = await markPayrollRunPaidService({
      payrollRunId,
      paidById: BigInt(req.employee.employeeId),
      paymentReference: result.data.paymentReference,
      timestamp: nowEpoch(),
    });
    return res.json({
      message: "Payroll run marked as paid",
      payrollRun: serializePayrollRun(payrollRun),
    });
  } catch (error) {
    return sendError(res, error, "Failed to mark payroll run as paid");
  }
};

export const getPayslips = async (req: AuthRequest, res: Response) => {
  const result = payslipListQuerySchema.safeParse(req.query);
  if (!result.success) {
    return res.status(400).json({ message: "Validation failed", errors: result.error.flatten() });
  }

  try {
    const payslips = await getPayslipsService({
      employeeId: result.data.employeeId ? BigInt(result.data.employeeId) : undefined,
      month: result.data.month ? Number(result.data.month) : undefined,
      year: result.data.year ? Number(result.data.year) : undefined,
      status: result.data.status,
    });
    return res.json({ count: payslips.length, payslips: payslips.map(serializePayslip) });
  } catch (error) {
    return sendError(res, error, "Failed to fetch payslips");
  }
};

export const getMyPayslips = async (req: AuthRequest, res: Response) => {
  if (!req.employee) return res.status(401).json({ message: "Authentication required" });

  const result = payslipListQuerySchema.safeParse(req.query);
  if (!result.success) {
    return res.status(400).json({ message: "Validation failed", errors: result.error.flatten() });
  }
  if (result.data.status && !employeeVisibleStatuses.includes(result.data.status)) {
    return res.status(400).json({ message: "Employees can only view Approved or Paid payslips" });
  }

  try {
    const payslips = await getPayslipsService({
      employeeId: BigInt(req.employee.employeeId),
      month: result.data.month ? Number(result.data.month) : undefined,
      year: result.data.year ? Number(result.data.year) : undefined,
      status: result.data.status,
      statuses: result.data.status
        ? undefined
        : employeeVisibleStatuses,
    });
    return res.json({ count: payslips.length, payslips: payslips.map(serializePayslip) });
  } catch (error) {
    return sendError(res, error, "Failed to fetch your payslips");
  }
};

/**
 * Generates a payslip for one employee, identified by employeeId + date +
 * month + year. SuperAdmin/Manager only. Works no matter what state the
 * target payroll run is in (Draft, Approved, even Paid) - a payslip for a
 * new employee is never blocked by a run-status conflict.
 */
export const generatePayslipForEmployee = async (req: AuthRequest, res: Response) => {
  if (!req.employee) return res.status(401).json({ message: "Authentication required" });

  const result = generatePayslipForEmployeeSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: "Validation failed", errors: result.error.flatten() });
  }

  try {
    const payslip = await generatePayslipForEmployeeService({
      employeeId: BigInt(result.data.employeeId),
      date: result.data.date,
      month: result.data.month,
      year: result.data.year,
      performedById: BigInt(req.employee.employeeId),
      timestamp: nowEpoch(),
    });
    return res.status(201).json({
      message: "Payslip generated successfully",
      payslip: payslip ? serializePayslip(payslip) : undefined,
    });
  } catch (error) {
    return sendError(res, error, "Failed to generate payslip");
  }
};

/**
 * Fetches payslip(s) for one employee - employeeId is the only identifier
 * used. Pass month+year to get exactly one period; omit them to list the
 * employee's full history (admins only - restricted roles must always
 * scope to a period, and only the current/previous month).
 */
export const getPayslipsByEmployee = async (req: AuthRequest, res: Response) => {
  if (!req.employee) return res.status(401).json({ message: "Authentication required" });
  const employeeId = parsePositiveBigInt(req.params.employeeId);
  if (!employeeId) return res.status(400).json({ message: "Invalid employee ID" });

  if (!isPayrollAdmin(req) && !isOwner(req, employeeId)) {
    return res.status(403).json({ message: "You cannot view this employee's payslips" });
  }

  const result = employeePayslipQuerySchema.safeParse(req.query);
  if (!result.success) {
    return res.status(400).json({ message: "Validation failed", errors: result.error.flatten() });
  }

  const admin = isPayrollAdmin(req);
  if (!admin && result.data.status && !employeeVisibleStatuses.includes(result.data.status)) {
    return res.status(400).json({ message: "You can only view Approved or Paid payslips" });
  }

  const month = result.data.month ? Number(result.data.month) : undefined;
  const year = result.data.year ? Number(result.data.year) : undefined;

  if (!admin && month !== undefined && year !== undefined && !isCurrentOrPreviousPeriod(month, year)) {
    return res.status(403).json({
      message: "You can only view payslips for the current or previous month",
    });
  }

  try {
    if (month !== undefined && year !== undefined) {
      const payslip = await getPayslipByEmployeePeriodService(employeeId, month, year);
      if (!payslip) return res.status(404).json({ message: "Payslip not found" });
      if (!admin && !employeeVisibleStatuses.includes(payslip.status)) {
        return res.status(403).json({ message: "This payslip is not available yet" });
      }
      return res.json({ payslip: serializePayslip(payslip) });
    }

    if (!admin) {
      return res.status(400).json({ message: "month and year are required" });
    }

    const payslips = await getPayslipsService({
      employeeId,
      status: result.data.status,
    });
    return res.json({ count: payslips.length, payslips: payslips.map(serializePayslip) });
  } catch (error) {
    return sendError(res, error, "Failed to fetch payslips");
  }
};

/**
 * Edits a draft payslip - employeeId + month + year identify it, no
 * payslipId is ever exposed to the caller. SuperAdmin/Manager only.
 */
export const updatePayslipByEmployee = async (req: AuthRequest, res: Response) => {
  if (!req.employee) return res.status(401).json({ message: "Authentication required" });
  const employeeId = parsePositiveBigInt(req.params.employeeId);
  if (!employeeId) return res.status(400).json({ message: "Invalid employee ID" });

  const periodResult = employeePayslipPeriodSchema.safeParse(req.query);
  if (!periodResult.success) {
    return res.status(400).json({ message: "Validation failed", errors: periodResult.error.flatten() });
  }

  const bodyResult = updatePayslipSchema.safeParse(req.body);
  if (!bodyResult.success) {
    return res.status(400).json({ message: "Validation failed", errors: bodyResult.error.flatten() });
  }

  try {
    const payslip = await updateDraftPayslipByEmployeeService({
      employeeId,
      month: Number(periodResult.data.month),
      year: Number(periodResult.data.year),
      changes: bodyResult.data,
      performedById: BigInt(req.employee.employeeId),
      timestamp: nowEpoch(),
    });
    return res.json({
      message: "Draft payslip updated successfully",
      payslip: payslip ? serializePayslip(payslip) : undefined,
    });
  } catch (error) {
    return sendError(res, error, "Failed to update payslip");
  }
};

/**
 * Downloads a payslip PDF - employeeId + month + year only. Restricted
 * roles may only download their own payslip, and only for the current or
 * previous calendar month.
 */
export const downloadPayslipPdfByEmployee = async (req: AuthRequest, res: Response) => {
  if (!req.employee) return res.status(401).json({ message: "Authentication required" });
  const employeeId = parsePositiveBigInt(req.params.employeeId);
  if (!employeeId) return res.status(400).json({ message: "Invalid employee ID" });

  if (!isPayrollAdmin(req) && !isOwner(req, employeeId)) {
    return res.status(403).json({ message: "You cannot download this employee's payslip" });
  }

  const periodResult = employeePayslipPeriodSchema.safeParse(req.query);
  if (!periodResult.success) {
    return res.status(400).json({ message: "Validation failed", errors: periodResult.error.flatten() });
  }

  const month = Number(periodResult.data.month);
  const year = Number(periodResult.data.year);
  const admin = isPayrollAdmin(req);

  if (!admin && !isCurrentOrPreviousPeriod(month, year)) {
    return res.status(403).json({
      message: "You can only download payslips for the current or previous month",
    });
  }

  try {
    const payslip = await getPayslipByEmployeePeriodService(employeeId, month, year);
    if (!payslip) return res.status(404).json({ message: "Payslip not found" });
    if (!admin && !employeeVisibleStatuses.includes(payslip.status)) {
      return res.status(403).json({ message: "This payslip is not available yet" });
    }

    const pdf = await createPayslipPdfBuffer(payslip);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${payslip.payslipNumber}.pdf"`
    );
    return res.send(pdf);
  } catch (error) {
    return sendError(res, error, "Failed to generate payslip PDF");
  }
};
