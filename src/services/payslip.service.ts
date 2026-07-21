import {
  AttendanceStatus,
  PayrollRunStatus,
  PayslipStatus,
  Prisma,
} from "@prisma/client";

import prisma from "../prisma";
import type { UpdatePayslipInput } from "../validations/payslip.validation";

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

const payrollRunInclude = {
  createdBy: {
    select: {
      employeeId: true,
      fullName: true,
      assignedRole: true,
    },
  },
  approvedBy: {
    select: {
      employeeId: true,
      fullName: true,
      assignedRole: true,
    },
  },
  payslips: {
    orderBy: { employeeNameSnapshot: "asc" as const },
    include: {
      earnings: { orderBy: { payslipEarningId: "asc" as const } },
      deductions: { orderBy: { payslipDeductionId: "asc" as const } },
    },
  },
} satisfies Prisma.PayrollRunInclude;

type MoneyInput = string | number | Prisma.Decimal;

interface LineItemInput {
  type: string;
  description?: string | null;
  amount: Prisma.Decimal;
  isTaxable?: boolean;
}

export interface PayrollRunFilters {
  year?: number;
  status?: PayrollRunStatus;
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

export const createPayrollRunService = async (data: {
  payrollMonth: number;
  payrollYear: number;
  currency: string;
  createdById: bigint;
  timestamp: bigint;
}) => {
  const period = getPayrollPeriod(data.payrollYear, data.payrollMonth);

  return prisma.payrollRun.create({
    data: {
      payrollMonth: data.payrollMonth,
      payrollYear: data.payrollYear,
      ...period,
      currency: data.currency,
      createdById: data.createdById,
      createdAt: data.timestamp,
      updatedAt: data.timestamp,
    },
    include: payrollRunInclude,
  });
};

export const getPayrollRunsService = (filters: PayrollRunFilters = {}) =>
  prisma.payrollRun.findMany({
    where: {
      payrollYear: filters.year,
      status: filters.status,
    },
    include: {
      createdBy: {
        select: { employeeId: true, fullName: true },
      },
      approvedBy: {
        select: { employeeId: true, fullName: true },
      },
      _count: { select: { payslips: true } },
    },
    orderBy: [{ payrollYear: "desc" }, { payrollMonth: "desc" }],
  });

export const getPayrollRunByIdService = (payrollRunId: bigint) =>
  prisma.payrollRun.findUnique({
    where: { payrollRunId },
    include: payrollRunInclude,
  });

export const generatePayslipsService = async (data: {
  payrollRunId: bigint;
  employeeIds?: bigint[];
  performedById: bigint;
  timestamp: bigint;
}) => {
  await prisma.$transaction(async (transaction) => {
    const payrollRun = await transaction.payrollRun.findUnique({
      where: { payrollRunId: data.payrollRunId },
    });

    if (!payrollRun) {
      throw new PayrollDomainError("Payroll run not found", 404);
    }

    if (payrollRun.status !== PayrollRunStatus.Draft) {
      throw new PayrollDomainError(
        "Payslips can only be generated while the payroll run is Draft",
        409
      );
    }

    await transaction.payrollRun.update({
      where: { payrollRunId: data.payrollRunId },
      data: { status: PayrollRunStatus.Processing, updatedAt: data.timestamp },
    });

    const employees = await transaction.employee.findMany({
      where: {
        isActive: true,
        employeeId: data.employeeIds ? { in: data.employeeIds } : undefined,
      },
      select: {
        employeeId: true,
        fullName: true,
        emailAddress: true,
        assignedRole: true,
        assignedDepartment: true,
        baseSalary: true,
        allowances: true,
        deductions: true,
        attendance: {
          where: {
            calendarDate: {
              gte: payrollRun.periodStart,
              lte: payrollRun.periodEnd,
            },
          },
          select: { shiftStatus: true },
        },
      },
      orderBy: { employeeId: "asc" },
    });

    if (data.employeeIds) {
      const foundIds = new Set(employees.map((employee) => employee.employeeId.toString()));
      const missingIds = data.employeeIds.filter((id) => !foundIds.has(id.toString()));
      if (missingIds.length > 0) {
        throw new PayrollDomainError(
          `Active employees not found: ${missingIds.join(", ")}`,
          404
        );
      }
    }

    if (employees.length === 0) {
      throw new PayrollDomainError("No active employees were found for payroll", 404);
    }

    const existingPayslips = await transaction.payslip.findMany({
      where: {
        payrollRunId: data.payrollRunId,
        employeeId: { in: employees.map((employee) => employee.employeeId) },
      },
      select: { employeeId: true },
    });
    const existingEmployeeIds = new Set(
      existingPayslips.map((payslip) => payslip.employeeId.toString())
    );

    const workingDays = countBusinessDays(
      payrollRun.periodStart,
      payrollRun.periodEnd
    );

    for (const employee of employees) {
      if (existingEmployeeIds.has(employee.employeeId.toString())) continue;

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

      if (netSalary.lessThan(0)) {
        throw new PayrollDomainError(
          `Deductions exceed earnings for employee ${employee.employeeId}`,
          400
        );
      }

      await transaction.payslip.create({
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
              },
              createdAt: data.timestamp,
            },
          },
        },
      });
    }

    await transaction.payrollRun.update({
      where: { payrollRunId: data.payrollRunId },
      data: { status: PayrollRunStatus.Draft, updatedAt: data.timestamp },
    });
  });

  return getPayrollRunByIdService(data.payrollRunId);
};

export const approvePayrollRunService = async (data: {
  payrollRunId: bigint;
  approvedById: bigint;
  timestamp: bigint;
}) => {
  await prisma.$transaction(async (transaction) => {
    const payrollRun = await transaction.payrollRun.findUnique({
      where: { payrollRunId: data.payrollRunId },
      include: { payslips: { select: { payslipId: true, status: true } } },
    });

    if (!payrollRun) throw new PayrollDomainError("Payroll run not found", 404);
    if (payrollRun.status !== PayrollRunStatus.Draft) {
      throw new PayrollDomainError("Only a Draft payroll run can be approved", 409);
    }
    if (payrollRun.payslips.length === 0) {
      throw new PayrollDomainError("Generate at least one payslip before approval", 409);
    }
    if (payrollRun.payslips.some((payslip) => payslip.status !== PayslipStatus.Draft)) {
      throw new PayrollDomainError("Every payslip must be Draft before approval", 409);
    }

    await transaction.payslip.updateMany({
      where: { payrollRunId: data.payrollRunId, status: PayslipStatus.Draft },
      data: {
        status: PayslipStatus.Approved,
        approvedAt: data.timestamp,
        approvedById: data.approvedById,
        updatedAt: data.timestamp,
      },
    });

    await transaction.payslipAuditLog.createMany({
      data: payrollRun.payslips.map((payslip) => ({
        payslipId: payslip.payslipId,
        action: "Approved",
        performedById: data.approvedById,
        previousData: { status: PayslipStatus.Draft },
        updatedData: { status: PayslipStatus.Approved },
        createdAt: data.timestamp,
      })),
    });

    await transaction.payrollRun.update({
      where: { payrollRunId: data.payrollRunId },
      data: {
        status: PayrollRunStatus.Approved,
        approvedById: data.approvedById,
        approvedAt: data.timestamp,
        updatedAt: data.timestamp,
      },
    });
  });

  return getPayrollRunByIdService(data.payrollRunId);
};

export const markPayrollRunPaidService = async (data: {
  payrollRunId: bigint;
  paidById: bigint;
  paymentReference?: string;
  timestamp: bigint;
}) => {
  await prisma.$transaction(async (transaction) => {
    const payrollRun = await transaction.payrollRun.findUnique({
      where: { payrollRunId: data.payrollRunId },
      include: { payslips: { select: { payslipId: true, status: true } } },
    });

    if (!payrollRun) throw new PayrollDomainError("Payroll run not found", 404);
    if (payrollRun.status !== PayrollRunStatus.Approved) {
      throw new PayrollDomainError("Only an Approved payroll run can be marked paid", 409);
    }

    await transaction.payslip.updateMany({
      where: { payrollRunId: data.payrollRunId, status: PayslipStatus.Approved },
      data: {
        status: PayslipStatus.Paid,
        paidAt: data.timestamp,
        paidById: data.paidById,
        paymentReference: data.paymentReference,
        updatedAt: data.timestamp,
      },
    });

    await transaction.payslipAuditLog.createMany({
      data: payrollRun.payslips.map((payslip) => ({
        payslipId: payslip.payslipId,
        action: "MarkedPaid",
        performedById: data.paidById,
        previousData: { status: payslip.status },
        updatedData: {
          status: PayslipStatus.Paid,
          paymentReference: data.paymentReference ?? null,
        },
        createdAt: data.timestamp,
      })),
    });

    await transaction.payrollRun.update({
      where: { payrollRunId: data.payrollRunId },
      data: {
        status: PayrollRunStatus.Paid,
        paidAt: data.timestamp,
        updatedAt: data.timestamp,
      },
    });
  });

  return getPayrollRunByIdService(data.payrollRunId);
};

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
