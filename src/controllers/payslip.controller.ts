import { PayslipStatus } from "@prisma/client";
import { Response } from "express";

import { AuthRequest } from "../middleware/auth.middleware";
import { createPayslipPdfBuffer } from "../services/payslip-pdf.service";
import {
  approvePayrollRunService,
  createPayrollRunService,
  generatePayslipsService,
  getPayrollRunByIdService,
  getPayrollRunsService,
  getPayslipByIdService,
  getPayslipsService,
  markPayrollRunPaidService,
  PayrollDomainError,
  updateDraftPayslipService,
} from "../services/payslip.service";
import {
  createPayrollRunSchema,
  generatePayslipsSchema,
  markPayrollPaidSchema,
  payrollRunListQuerySchema,
  payslipListQuerySchema,
  updatePayslipSchema,
} from "../validations/payslip.validation";
import { epochDayToDateOnly, epochToIso, nowEpoch } from "../utils/epoch";

const payrollAdminRoles = new Set(["SuperAdmin", "HR"]);
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

export const getPayslipById = async (req: AuthRequest, res: Response) => {
  const payslipId = parsePositiveBigInt(req.params.id);
  if (!payslipId) return res.status(400).json({ message: "Invalid payslip ID" });

  try {
    const payslip = await getPayslipByIdService(payslipId);
    if (!payslip) return res.status(404).json({ message: "Payslip not found" });

    if (!isPayrollAdmin(req) && !isOwner(req, payslip.employeeId)) {
      return res.status(403).json({ message: "You cannot view this payslip" });
    }
    if (
      !isPayrollAdmin(req) &&
      !employeeVisibleStatuses.includes(payslip.status)
    ) {
      return res.status(403).json({ message: "This payslip is not available yet" });
    }

    return res.json({ payslip: serializePayslip(payslip) });
  } catch (error) {
    return sendError(res, error, "Failed to fetch payslip");
  }
};

export const updatePayslip = async (req: AuthRequest, res: Response) => {
  if (!req.employee) return res.status(401).json({ message: "Authentication required" });
  const payslipId = parsePositiveBigInt(req.params.id);
  if (!payslipId) return res.status(400).json({ message: "Invalid payslip ID" });

  const result = updatePayslipSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: "Validation failed", errors: result.error.flatten() });
  }

  try {
    const payslip = await updateDraftPayslipService({
      payslipId,
      changes: result.data,
      performedById: BigInt(req.employee.employeeId),
      timestamp: nowEpoch(),
    });
    return res.json({
      message: "Draft payslip updated successfully",
      payslip: serializePayslip(payslip),
    });
  } catch (error) {
    return sendError(res, error, "Failed to update payslip");
  }
};

export const downloadPayslipPdf = async (req: AuthRequest, res: Response) => {
  const payslipId = parsePositiveBigInt(req.params.id);
  if (!payslipId) return res.status(400).json({ message: "Invalid payslip ID" });

  try {
    const payslip = await getPayslipByIdService(payslipId);
    if (!payslip) return res.status(404).json({ message: "Payslip not found" });
    if (!isPayrollAdmin(req) && !isOwner(req, payslip.employeeId)) {
      return res.status(403).json({ message: "You cannot download this payslip" });
    }
    if (
      !isPayrollAdmin(req) &&
      !employeeVisibleStatuses.includes(payslip.status)
    ) {
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
