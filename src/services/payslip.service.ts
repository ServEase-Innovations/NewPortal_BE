import {
  AttendanceStatus,
  PayslipStatus,
  Prisma,
} from "@prisma/client";

import prisma from "../prisma";
import type { UpdatePayslipInput } from "../validations/payslip.validation";
import { dateOnlyToEpoch } from "../utils/epoch";

const payslipInclude = {
  employee: {
    select: {
      employeeId: true,
      fullName: true,
      emailAddress: true,
      assignedRole: true,
      assignedDepartment: true,
      teamId: true,
      managerId: true,
    },
  },
  payrollRun: {
    select: {
      payrollRunId: true,
      payrollMonth: true,
      payrollYear: true,
      periodStart: true,
      periodEnd: true,
      currency: true,
      status: true,
    },
  },
  earnings: {
    orderBy: { payslipEarningId: "asc" as const },
  },
  deductions: {
    orderBy: { payslipDeductionId: "asc" as const },
  },
  auditLogs: {
    orderBy: { createdAt: "desc" as const },
    include: {
      performedBy: {
        select: {
          employeeId: true,
          fullName: true,
          assignedRole: true,
        },
      },
    },
  },
} satisfies Prisma.PayslipInclude;

type MoneyInput = string | number | Prisma.Decimal;

interface LineItemInput {
  type: string;
  description?: string | null;
  amount: Prisma.Decimal;
  isTaxable?: boolean;
}

export interface PayslipFilters {
  employeeId?: bigint;
  month?: number;
  year?: number;
  status?: PayslipStatus;
  statuses?: PayslipStatus[];
}

export class PayrollDomainError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = "PayrollDomainError";
  }
}

const toMoney = (value: MoneyInput): Prisma.Decimal =>
  new Prisma.Decimal(value).toDecimalPlaces(2);

const sumMoney = (items: Array<{ amount: Prisma.Decimal }>): Prisma.Decimal =>
  items.reduce(
    (total, item) => total.plus(item.amount),
    new Prisma.Decimal(0)
  ).toDecimalPlaces(2);

const toDayDecimal = (value: string | number | Prisma.Decimal): Prisma.Decimal =>
  new Prisma.Decimal(value).toDecimalPlaces(2);

const getPayrollPeriod = (year: number, month: number) => ({
  periodStart: BigInt(Date.UTC(year, month - 1, 1)),
  periodEnd: BigInt(Date.UTC(year, month, 0)),
});

const countBusinessDays = (periodStart: bigint, periodEnd: bigint): number => {
  const start = Number(periodStart);
  const end = Number(periodEnd);
  let count = 0;

  for (let current = start; current <= end; current += 86_400_000) {
    const day = new Date(current).getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
  }

  return count;
};

const payslipNumberFor = (
  payrollYear: number,
  payrollMonth: number,
  employeeId: bigint
) => `PS-${payrollYear}${String(payrollMonth).padStart(2, "0")}-${employeeId}`;

const auditSnapshot = (payslip: any): Prisma.InputJsonObject => ({
  status: payslip.status,
  workingDays: payslip.workingDays.toString(),
  payableDays: payslip.payableDays.toString(),
  unpaidLeaveDays: payslip.unpaidLeaveDays.toString(),
  totalEarnings: payslip.totalEarnings.toString(),
  totalDeductions: payslip.totalDeductions.toString(),
  netSalary: payslip.netSalary.toString(),
  bankAccountMasked: payslip.bankAccountMasked ?? null,
});

/**
 * Computes the earning/deduction line items and totals for one employee
 * over a given (possibly prorated) period.
 */
const buildEmployeePayslipFigures = (
  employee: {
    baseSalary: MoneyInput;
    allowances: MoneyInput;
    deductions: MoneyInput;
    attendance: { shiftStatus: AttendanceStatus }[];
  },
  workingDays: number
) => {
  const absentDays = Math.min(
    employee.attendance.filter(
      (attendance) => attendance.shiftStatus === AttendanceStatus.Absent
    ).length,
    workingDays
  );
  const payableDays = Math.max(workingDays - absentDays, 0);
  const baseSalary = toMoney(employee.baseSalary);
  const allowances = toMoney(employee.allowances);
  const fixedDeductions = toMoney(employee.deductions);
  const unpaidLeaveDeduction =
    workingDays > 0
      ? baseSalary.dividedBy(workingDays).times(absentDays).toDecimalPlaces(2)
      : new Prisma.Decimal(0);

  const earnings: LineItemInput[] = [
    {
      type: "Basic Salary",
      description: "Monthly base salary",
      amount: baseSalary,
      isTaxable: true,
    },
  ];

  if (allowances.greaterThan(0)) {
    earnings.push({
      type: "Allowances",
      description: "Employee allowance snapshot",
      amount: allowances,
      isTaxable: true,
    });
  }

  const deductions: LineItemInput[] = [];
  if (fixedDeductions.greaterThan(0)) {
    deductions.push({
      type: "Standard Deductions",
      description: "Employee deduction snapshot",
      amount: fixedDeductions,
    });
  }
  if (unpaidLeaveDeduction.greaterThan(0)) {
    deductions.push({
      type: "Unpaid Leave",
      description: `${absentDays} absent working day(s)`,
      amount: unpaidLeaveDeduction,
    });
  }

  const totalEarnings = sumMoney(earnings);
  const totalDeductions = sumMoney(deductions);
  const netSalary = totalEarnings.minus(totalDeductions).toDecimalPlaces(2);

  return {
    absentDays,
    payableDays,
    baseSalary,
    allowances,
    fixedDeductions,
    earnings,
    deductions,
    totalEarnings,
    totalDeductions,
    netSalary,
  };
};

/**
 * Generates a single employee's payslip identified only by employeeId,
 * date, month and year. Finds (or creates) the payroll run for the
 * requested month/year automatically.
 *
 * Unlike the bulk generator's original behavior, this is deliberately
 * allowed regardless of the payroll run's status - including Approved or
 * Paid - so a payslip can always be generated for a new employee without
 * hitting a run-status conflict error. If `date` falls after the run's
 * period start (e.g. the employee's joining date), the payable period is
 * prorated from that date through the end of the payroll period.
 *
 * SuperAdmin/Manager may call this repeatedly (for the same or different
 * employees) with no artificial "one-shot" restriction.
 */
export const generatePayslipForEmployeeService = async (data: {
  employeeId: bigint;
  date: string;
  month: number;
  year: number;
  performedById: bigint;
  timestamp: bigint;
}) => {
  const dateEpoch = dateOnlyToEpoch(data.date);

  const payslip = await prisma.$transaction(async (transaction) => {
    let payrollRun = await transaction.payrollRun.findUnique({
      where: {
        unique_payroll_month_year: {
          payrollMonth: data.month,
          payrollYear: data.year,
        },
      },
    });

    if (!payrollRun) {
      const period = getPayrollPeriod(data.year, data.month);
      payrollRun = await transaction.payrollRun.create({
        data: {
          payrollMonth: data.month,
          payrollYear: data.year,
          ...period,
          createdById: data.performedById,
          createdAt: data.timestamp,
          updatedAt: data.timestamp,
        },
      });
    }

    if (dateEpoch > payrollRun.periodEnd) {
      throw new PayrollDomainError(
        "The provided date falls after the payroll period end",
        400
      );
    }

    const existing = await transaction.payslip.findUnique({
      where: {
        unique_employee_payroll_run: {
          payrollRunId: payrollRun.payrollRunId,
          employeeId: data.employeeId,
        },
      },
      select: { payslipId: true },
    });

    if (existing) {
      throw new PayrollDomainError(
        "A payslip already exists for this employee in the selected period",
        409
      );
    }

    const employee = await transaction.employee.findFirst({
      where: { employeeId: data.employeeId, isActive: true },
      select: {
        employeeId: true,
        fullName: true,
        emailAddress: true,
        assignedRole: true,
        assignedDepartment: true,
        baseSalary: true,
        allowances: true,
        deductions: true,
      },
    });

    if (!employee) {
      throw new PayrollDomainError("Active employee not found", 404);
    }

    const effectivePeriodStart =
      dateEpoch > payrollRun.periodStart ? dateEpoch : payrollRun.periodStart;

    const attendance = await transaction.attendance.findMany({
      where: {
        employeeId: data.employeeId,
        calendarDate: { gte: effectivePeriodStart, lte: payrollRun.periodEnd },
      },
      select: { shiftStatus: true },
    });

    const workingDays = countBusinessDays(effectivePeriodStart, payrollRun.periodEnd);

    const {
      absentDays,
      payableDays,
      baseSalary,
      allowances,
      fixedDeductions,
      earnings,
      deductions,
      totalEarnings,
      totalDeductions,
      netSalary,
    } = buildEmployeePayslipFigures({ ...employee, attendance }, workingDays);

    if (netSalary.lessThan(0)) {
      throw new PayrollDomainError(
        `Deductions exceed earnings for employee ${employee.employeeId}`,
        400
      );
    }

    const created = await transaction.payslip.create({
      data: {
        payrollRunId: payrollRun.payrollRunId,
        employeeId: employee.employeeId,
        payslipNumber: payslipNumberFor(
          payrollRun.payrollYear,
          payrollRun.payrollMonth,
          employee.employeeId
        ),
        employeeNameSnapshot: employee.fullName,
        employeeEmailSnapshot: employee.emailAddress,
        employeeRoleSnapshot: employee.assignedRole,
        employeeDepartmentSnapshot: employee.assignedDepartment,
        currency: payrollRun.currency,
        workingDays: toDayDecimal(workingDays),
        payableDays: toDayDecimal(payableDays),
        unpaidLeaveDays: toDayDecimal(absentDays),
        baseSalarySnapshot: baseSalary,
        allowanceSnapshot: allowances,
        deductionSnapshot: fixedDeductions,
        totalEarnings,
        totalDeductions,
        netSalary,
        generatedAt: data.timestamp,
        updatedAt: data.timestamp,
        earnings: {
          create: earnings.map((earning) => ({
            earningType: earning.type,
            description: earning.description,
            amount: earning.amount,
            isTaxable: earning.isTaxable ?? true,
            createdAt: data.timestamp,
          })),
        },
        deductions: {
          create: deductions.map((deduction) => ({
            deductionType: deduction.type,
            description: deduction.description,
            amount: deduction.amount,
            createdAt: data.timestamp,
          })),
        },
        auditLogs: {
          create: {
            action: "Generated",
            performedById: data.performedById,
            updatedData: {
              status: PayslipStatus.Draft,
              totalEarnings: totalEarnings.toFixed(2),
              totalDeductions: totalDeductions.toFixed(2),
              netSalary: netSalary.toFixed(2),
              effectivePeriodStart: effectivePeriodStart.toString(),
            },
            createdAt: data.timestamp,
          },
        },
      },
    });

    return created;
  });

  return getPayslipByIdService(payslip.payslipId);
};

/**
 * Looks up a single payslip using employeeId + month + year only -
 * the internal payslipId is never required by the caller.
 */
export const getPayslipByEmployeePeriodService = (
  employeeId: bigint,
  month: number,
  year: number
) =>
  prisma.payslip.findFirst({
    where: {
      employeeId,
      payrollRun: { payrollMonth: month, payrollYear: year },
    },
    include: payslipInclude,
  });

export const getPayslipsService = (filters: PayslipFilters = {}) => {
  const where: Prisma.PayslipWhereInput = {
    employeeId: filters.employeeId,
    status: filters.status ?? (filters.statuses ? { in: filters.statuses } : undefined),
  };

  if (filters.month !== undefined || filters.year !== undefined) {
    where.payrollRun = {
      payrollMonth: filters.month,
      payrollYear: filters.year,
    };
  }

  return prisma.payslip.findMany({
    where,
    include: payslipInclude,
    orderBy: [{ generatedAt: "desc" }, { payslipId: "desc" }],
  });
};

export const getPayslipByIdService = (payslipId: bigint) =>
  prisma.payslip.findUnique({
    where: { payslipId },
    include: payslipInclude,
  });

/**
 * Resolves employeeId + month/year to the underlying payslipId and then
 * applies the same update logic as updateDraftPayslipService. Keeps
 * employeeId as the only identifier callers ever need to supply.
 */
export const updateDraftPayslipByEmployeeService = async (data: {
  employeeId: bigint;
  month: number;
  year: number;
  changes: UpdatePayslipInput;
  performedById: bigint;
  timestamp: bigint;
}) => {
  const existing = await prisma.payslip.findFirst({
    where: {
      employeeId: data.employeeId,
      payrollRun: { payrollMonth: data.month, payrollYear: data.year },
    },
    select: { payslipId: true },
  });

  if (!existing) {
    throw new PayrollDomainError(
      "No payslip found for this employee in the selected period",
      404
    );
  }

  return updateDraftPayslipService({
    payslipId: existing.payslipId,
    changes: data.changes,
    performedById: data.performedById,
    timestamp: data.timestamp,
  });
};

export const updateDraftPayslipService = async (data: {
  payslipId: bigint;
  changes: UpdatePayslipInput;
  performedById: bigint;
  timestamp: bigint;
}) => {
  const existing = await prisma.payslip.findUnique({
    where: { payslipId: data.payslipId },
    include: { earnings: true, deductions: true },
  });

  if (!existing) throw new PayrollDomainError("Payslip not found", 404);
  if (existing.status !== PayslipStatus.Draft) {
    throw new PayrollDomainError("Approved or paid payslips cannot be edited", 409);
  }

  const workingDays = data.changes.workingDays !== undefined
    ? toDayDecimal(data.changes.workingDays)
    : existing.workingDays;
  const payableDays = data.changes.payableDays !== undefined
    ? toDayDecimal(data.changes.payableDays)
    : existing.payableDays;
  const unpaidLeaveDays = data.changes.unpaidLeaveDays !== undefined
    ? toDayDecimal(data.changes.unpaidLeaveDays)
    : existing.unpaidLeaveDays;

  if (payableDays.greaterThan(workingDays) || unpaidLeaveDays.greaterThan(workingDays)) {
    throw new PayrollDomainError(
      "Payable days and unpaid leave days cannot exceed working days"
    );
  }

  const earnings = data.changes.earnings
    ? data.changes.earnings.map((earning) => ({
        earningType: earning.earningType.trim(),
        description: earning.description?.trim() || null,
        amount: toMoney(earning.amount),
        isTaxable: earning.isTaxable,
      }))
    : existing.earnings.map((earning) => ({
        earningType: earning.earningType,
        description: earning.description,
        amount: earning.amount,
        isTaxable: earning.isTaxable,
      }));

  const deductions = data.changes.deductions
    ? data.changes.deductions.map((deduction) => ({
        deductionType: deduction.deductionType.trim(),
        description: deduction.description?.trim() || null,
        amount: toMoney(deduction.amount),
      }))
    : existing.deductions.map((deduction) => ({
        deductionType: deduction.deductionType,
        description: deduction.description,
        amount: deduction.amount,
      }));

  const totalEarnings = sumMoney(earnings);
  const totalDeductions = sumMoney(deductions);
  const netSalary = totalEarnings.minus(totalDeductions).toDecimalPlaces(2);
  if (netSalary.lessThan(0)) {
    throw new PayrollDomainError("Total deductions cannot exceed total earnings");
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.payslip.update({
      where: { payslipId: data.payslipId },
      data: {
        workingDays,
        payableDays,
        unpaidLeaveDays,
        bankAccountMasked:
          data.changes.bankAccountMasked === undefined
            ? undefined
            : data.changes.bankAccountMasked?.trim() || null,
        totalEarnings,
        totalDeductions,
        netSalary,
        updatedAt: data.timestamp,
      },
    });

    if (data.changes.earnings !== undefined) {
      await transaction.payslipEarning.deleteMany({
        where: { payslipId: data.payslipId },
      });
      if (earnings.length > 0) {
        await transaction.payslipEarning.createMany({
          data: earnings.map((earning) => ({
            payslipId: data.payslipId,
            ...earning,
            createdAt: data.timestamp,
          })),
        });
      }
    }

    if (data.changes.deductions !== undefined) {
      await transaction.payslipDeduction.deleteMany({
        where: { payslipId: data.payslipId },
      });
      if (deductions.length > 0) {
        await transaction.payslipDeduction.createMany({
          data: deductions.map((deduction) => ({
            payslipId: data.payslipId,
            ...deduction,
            createdAt: data.timestamp,
          })),
        });
      }
    }

    await transaction.payslipAuditLog.create({
      data: {
        payslipId: data.payslipId,
        action: "Updated",
        performedById: data.performedById,
        previousData: auditSnapshot(existing),
        updatedData: {
          status: existing.status,
          workingDays: workingDays.toFixed(2),
          payableDays: payableDays.toFixed(2),
          unpaidLeaveDays: unpaidLeaveDays.toFixed(2),
          totalEarnings: totalEarnings.toFixed(2),
          totalDeductions: totalDeductions.toFixed(2),
          netSalary: netSalary.toFixed(2),
          bankAccountMasked:
            data.changes.bankAccountMasked === undefined
              ? existing.bankAccountMasked
              : data.changes.bankAccountMasked,
        },
        createdAt: data.timestamp,
      },
    });
  });

  return getPayslipByIdService(data.payslipId);
};
