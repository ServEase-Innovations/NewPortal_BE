import prisma from "../prisma";
import { Prisma, LeaveType, LeaveRequestStatus } from "@prisma/client";

// ============================================================================
// LEAVE POLICY SERVICE
// ============================================================================

/**
 * Get or create leave policy for a specific year
 * If no policy exists, creates default policy with 18 privilege + 6 flexi days
 */
export const getOrCreateLeavePolicyService = async (year: number) => {
  let policy = await prisma.leavePolicy.findFirst({
    where: { year },
  });

  if (!policy) {
    // Create default policy
    policy = await prisma.leavePolicy.create({
      data: {
        year,
        privilegeLeaveDays: 18,
        flexiLeaveDays: 6,
        maternityLeaveDays: 182,
        compOffLeaveDays: 0,
        carryForwardAllowed: true,
        maxCarryForwardDays: 5,
        encashmentAllowed: false,
        maxEncashmentDays: 0,
        minNoticePrivilege: 7,
        minNoticeFlexi: 1,
        maxConsecutivePrivilege: 15,
        maxConsecutiveFlexi: 5,
        halfDayLeaveAllowed: true,
        isActive: true,
        createdAt: BigInt(Date.now()),
        updatedAt: BigInt(Date.now()),
      },
    });
  }

  return policy;
};

/**
 * Get active leave policy for a year
 */
export const getLeavePolicyByYearService = async (year: number) => {
  return prisma.leavePolicy.findFirst({
    where: { year, isActive: true },
  });
};

/**
 * Update leave policy (HR admin only)
 */
export const updateLeavePolicyService = async (
  year: number,
  data: Partial<Prisma.LeavePolicyUpdateInput>
) => {
  return prisma.leavePolicy.update({
    where: { year },
    data: {
      ...data,
      updatedAt: BigInt(Date.now()),
    },
  });
};

// ============================================================================
// LEAVE BALANCE SERVICE
// ============================================================================

/**
 * Initialize leave balances for an employee for a specific year
 * Creates balance records for Privilege and Flexi leave types
 */
export const initializeLeaveBalancesService = async (
  employeeId: bigint,
  year: number
) => {
  const policy = await getOrCreateLeavePolicyService(year);
  const now = BigInt(Date.now());

  // Check if balances already exist
  const existing = await prisma.leaveBalance.findMany({
    where: { employeeId, year },
  });

  if (existing.length > 0) {
    return existing;
  }

  // Create Privilege leave balance (18 days)
  const privilegeBalance = await prisma.leaveBalance.create({
    data: {
      employeeId,
      year,
      leaveType: LeaveType.Privilege,
      totalAllocated: policy.privilegeLeaveDays,
      totalUsed: 0,
      totalPending: 0,
      totalAvailable: policy.privilegeLeaveDays,
      carriedForward: 0,
      lastUpdated: now,
      createdAt: now,
    },
  });

  // Create Flexi leave balance (6 days total for Casual + Sick + Paternity)
  // We'll track as a single "Casual" type that covers all flexi leave reasons
  const flexiBalance = await prisma.leaveBalance.create({
    data: {
      employeeId,
      year,
      leaveType: LeaveType.Casual,
      totalAllocated: policy.flexiLeaveDays,
      totalUsed: 0,
      totalPending: 0,
      totalAvailable: policy.flexiLeaveDays,
      carriedForward: 0,
      lastUpdated: now,
      createdAt: now,
    },
  });

  return [privilegeBalance, flexiBalance];
};

/**
 * Get leave balance for employee by type and year
 */
export const getLeaveBalanceService = async (
  employeeId: bigint,
  year: number,
  leaveType: LeaveType
) => {
  return prisma.leaveBalance.findUnique({
    where: {
      unique_employee_year_leave_type: {
        employeeId,
        year,
        leaveType,
      },
    },
  });
};

/**
 * Get all leave balances for an employee for a specific year
 */
export const getAllLeaveBalancesService = async (
  employeeId: bigint,
  year: number
) => {
  let balances = await prisma.leaveBalance.findMany({
    where: { employeeId, year },
    include: {
      employee: {
        select: {
          employeeId: true,
          fullName: true,
          emailAddress: true,
          assignedRole: true,
        },
      },
    },
  });

  // Initialize if not exists
  if (balances.length === 0) {
    await initializeLeaveBalancesService(employeeId, year);
    balances = await prisma.leaveBalance.findMany({
      where: { employeeId, year },
      include: {
        employee: {
          select: {
            employeeId: true,
            fullName: true,
            emailAddress: true,
            assignedRole: true,
          },
        },
      },
    });
  }

  return balances;
};

/**
 * Update leave balance after request approval/rejection
 */
export const updateLeaveBalanceService = async (
  employeeId: bigint,
  year: number,
  leaveType: LeaveType,
  totalDays: number,
  action: "reserve" | "confirm" | "release"
) => {
  const balance = await getLeaveBalanceService(employeeId, year, leaveType);

  if (!balance) {
    throw new Error(
      `Leave balance not found for employee ${employeeId}, year ${year}, type ${leaveType}`
    );
  }

  let updateData: Prisma.LeaveBalanceUpdateInput;

  switch (action) {
    case "reserve": // When leave is submitted (Pending)
      updateData = {
        totalPending: {
          increment: new Prisma.Decimal(totalDays),
        },
        totalAvailable: {
          decrement: new Prisma.Decimal(totalDays),
        },
        lastUpdated: BigInt(Date.now()),
      };
      break;

    case "confirm": // When leave is approved
      updateData = {
        totalPending: {
          decrement: new Prisma.Decimal(totalDays),
        },
        totalUsed: {
          increment: new Prisma.Decimal(totalDays),
        },
        lastUpdated: BigInt(Date.now()),
      };
      break;

    case "release": // When leave is rejected or cancelled
      updateData = {
        totalPending: {
          decrement: new Prisma.Decimal(totalDays),
        },
        totalAvailable: {
          increment: new Prisma.Decimal(totalDays),
        },
        lastUpdated: BigInt(Date.now()),
      };
      break;
  }

  return prisma.leaveBalance.update({
    where: {
      unique_employee_year_leave_type: {
        employeeId,
        year,
        leaveType,
      },
    },
    data: updateData,
  });
};

// ============================================================================
// LEAVE REQUEST SERVICE
// ============================================================================

/**
 * Create a new leave request
 */
export const createLeaveRequestService = async (
  data: Omit<Prisma.LeaveRequestUncheckedCreateInput, 'submittedAt' | 'createdAt' | 'updatedAt' | 'status'>
) => {
  const now = BigInt(Date.now());

  // Create leave request
  const leaveRequest = await prisma.leaveRequest.create({
    data: {
      ...data,
      status: LeaveRequestStatus.Pending,
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
    },
    include: {
      employee: {
        select: {
          employeeId: true,
          fullName: true,
          emailAddress: true,
          assignedRole: true,
          managerId: true,
        },
      },
    },
  });

  // Reserve leave balance (mark as pending)
  const fromDate = new Date(Number(data.fromDate));
  const year = fromDate.getFullYear();

  // Map flexi leave types to Casual for balance tracking
  let balanceLeaveType = data.leaveType;
  if (
    data.leaveType === LeaveType.Sick ||
    data.leaveType === LeaveType.Paternity
  ) {
    balanceLeaveType = LeaveType.Casual; // All flexi types use same balance
  }

  const employeeIdBigInt = typeof data.employeeId === 'bigint' ? data.employeeId : BigInt(data.employeeId);

  await updateLeaveBalanceService(
    employeeIdBigInt,
    year,
    balanceLeaveType,
    typeof data.totalDays === 'number' ? data.totalDays : Number(data.totalDays),
    "reserve"
  );

  return leaveRequest;
};

/**
 * Get all leave requests for an employee
 */
export const getLeaveRequestsByEmployeeService = async (
  employeeId: bigint,
  status?: LeaveRequestStatus
) => {
  return prisma.leaveRequest.findMany({
    where: {
      employeeId,
      ...(status && { status }),
    },
    include: {
      employee: {
        select: {
          employeeId: true,
          fullName: true,
          emailAddress: true,
          assignedRole: true,
        },
      },
      reviewedBy: {
        select: {
          employeeId: true,
          fullName: true,
          emailAddress: true,
          assignedRole: true,
        },
      },
    },
    orderBy: { submittedAt: "desc" },
  });
};

/**
 * Get pending leave requests for a manager to review
 */
export const getPendingLeaveRequestsForManagerService = async (
  managerId: bigint
) => {
  // Get all employees reporting to this manager
  const subordinates = await prisma.employee.findMany({
    where: { managerId },
    select: { employeeId: true },
  });

  const subordinateIds = subordinates.map((s) => s.employeeId);

  return prisma.leaveRequest.findMany({
    where: {
      employeeId: { in: subordinateIds },
      status: LeaveRequestStatus.Pending,
    },
    include: {
      employee: {
        select: {
          employeeId: true,
          fullName: true,
          emailAddress: true,
          assignedRole: true,
          managerId: true,
        },
      },
    },
    orderBy: { submittedAt: "asc" },
  });
};

/**
 * Get leave request by ID
 */
export const getLeaveRequestByIdService = async (leaveRequestId: bigint) => {
  return prisma.leaveRequest.findUnique({
    where: { leaveRequestId },
    include: {
      employee: {
        select: {
          employeeId: true,
          fullName: true,
          emailAddress: true,
          assignedRole: true,
          managerId: true,
        },
      },
      reviewedBy: {
        select: {
          employeeId: true,
          fullName: true,
          emailAddress: true,
          assignedRole: true,
        },
      },
    },
  });
};

/**
 * Approve leave request
 */
export const approveLeaveRequestService = async (
  leaveRequestId: bigint,
  reviewedById: bigint,
  reviewComments?: string
) => {
  const leaveRequest = await getLeaveRequestByIdService(leaveRequestId);

  if (!leaveRequest) {
    throw new Error("Leave request not found");
  }

  if (leaveRequest.status !== LeaveRequestStatus.Pending) {
    throw new Error(
      `Cannot approve leave request with status: ${leaveRequest.status}`
    );
  }

  const now = BigInt(Date.now());

  // Update leave request status
  const updatedRequest = await prisma.leaveRequest.update({
    where: { leaveRequestId },
    data: {
      status: LeaveRequestStatus.Approved,
      reviewedById,
      reviewedAt: now,
      reviewComments,
      updatedAt: now,
    },
    include: {
      employee: {
        select: {
          employeeId: true,
          fullName: true,
          emailAddress: true,
        },
      },
      reviewedBy: {
        select: {
          employeeId: true,
          fullName: true,
          emailAddress: true,
        },
      },
    },
  });

  // Update leave balance: move from pending to used
  const fromDate = new Date(Number(leaveRequest.fromDate));
  const year = fromDate.getFullYear();

  let balanceLeaveType = leaveRequest.leaveType;
  if (
    leaveRequest.leaveType === LeaveType.Sick ||
    leaveRequest.leaveType === LeaveType.Paternity
  ) {
    balanceLeaveType = LeaveType.Casual;
  }

  await updateLeaveBalanceService(
    leaveRequest.employeeId,
    year,
    balanceLeaveType,
    Number(leaveRequest.totalDays),
    "confirm"
  );

  return updatedRequest;
};

/**
 * Reject leave request
 */
export const rejectLeaveRequestService = async (
  leaveRequestId: bigint,
  reviewedById: bigint,
  reviewComments: string
) => {
  const leaveRequest = await getLeaveRequestByIdService(leaveRequestId);

  if (!leaveRequest) {
    throw new Error("Leave request not found");
  }

  if (leaveRequest.status !== LeaveRequestStatus.Pending) {
    throw new Error(
      `Cannot reject leave request with status: ${leaveRequest.status}`
    );
  }

  const now = BigInt(Date.now());

  // Update leave request status
  const updatedRequest = await prisma.leaveRequest.update({
    where: { leaveRequestId },
    data: {
      status: LeaveRequestStatus.Rejected,
      reviewedById,
      reviewedAt: now,
      reviewComments,
      updatedAt: now,
    },
    include: {
      employee: {
        select: {
          employeeId: true,
          fullName: true,
          emailAddress: true,
        },
      },
      reviewedBy: {
        select: {
          employeeId: true,
          fullName: true,
          emailAddress: true,
        },
      },
    },
  });

  // Update leave balance: release pending balance back to available
  const fromDate = new Date(Number(leaveRequest.fromDate));
  const year = fromDate.getFullYear();

  let balanceLeaveType = leaveRequest.leaveType;
  if (
    leaveRequest.leaveType === LeaveType.Sick ||
    leaveRequest.leaveType === LeaveType.Paternity
  ) {
    balanceLeaveType = LeaveType.Casual;
  }

  await updateLeaveBalanceService(
    leaveRequest.employeeId,
    year,
    balanceLeaveType,
    Number(leaveRequest.totalDays),
    "release"
  );

  return updatedRequest;
};

/**
 * Cancel leave request (employee initiated)
 */
export const cancelLeaveRequestService = async (
  leaveRequestId: bigint,
  employeeId: bigint,
  cancellationReason: string
) => {
  const leaveRequest = await getLeaveRequestByIdService(leaveRequestId);

  if (!leaveRequest) {
    throw new Error("Leave request not found");
  }

  if (leaveRequest.employeeId !== employeeId) {
    throw new Error("Unauthorized: Cannot cancel another employee's leave");
  }

  if (
    leaveRequest.status !== LeaveRequestStatus.Pending &&
    leaveRequest.status !== LeaveRequestStatus.Approved
  ) {
    throw new Error(
      `Cannot cancel leave request with status: ${leaveRequest.status}`
    );
  }

  const now = BigInt(Date.now());

  // Update leave request status
  const updatedRequest = await prisma.leaveRequest.update({
    where: { leaveRequestId },
    data: {
      status: LeaveRequestStatus.Cancelled,
      cancelledAt: now,
      cancellationReason,
      updatedAt: now,
    },
    include: {
      employee: {
        select: {
          employeeId: true,
          fullName: true,
          emailAddress: true,
        },
      },
    },
  });

  // Update leave balance: release balance
  const fromDate = new Date(Number(leaveRequest.fromDate));
  const year = fromDate.getFullYear();

  let balanceLeaveType = leaveRequest.leaveType;
  if (
    leaveRequest.leaveType === LeaveType.Sick ||
    leaveRequest.leaveType === LeaveType.Paternity
  ) {
    balanceLeaveType = LeaveType.Casual;
  }

  if (leaveRequest.status === LeaveRequestStatus.Pending) {
    // Was pending, release from pending to available
    await updateLeaveBalanceService(
      leaveRequest.employeeId,
      year,
      balanceLeaveType,
      Number(leaveRequest.totalDays),
      "release"
    );
  } else if (leaveRequest.status === LeaveRequestStatus.Approved) {
    // Was approved, add back to available (from used)
    const balance = await getLeaveBalanceService(
      leaveRequest.employeeId,
      year,
      balanceLeaveType
    );

    if (balance) {
      await prisma.leaveBalance.update({
        where: {
          unique_employee_year_leave_type: {
            employeeId: leaveRequest.employeeId,
            year,
            leaveType: balanceLeaveType,
          },
        },
        data: {
          totalUsed: {
            decrement: new Prisma.Decimal(Number(leaveRequest.totalDays)),
          },
          totalAvailable: {
            increment: new Prisma.Decimal(Number(leaveRequest.totalDays)),
          },
          lastUpdated: now,
        },
      });
    }
  }

  return updatedRequest;
};

/**
 * Check if employee has approved leave for a specific date
 */
export const hasApprovedLeaveOnDateService = async (
  employeeId: bigint,
  dateEpoch: bigint
) => {
  const approvedLeaves = await prisma.leaveRequest.findMany({
    where: {
      employeeId,
      status: LeaveRequestStatus.Approved,
      fromDate: { lte: dateEpoch },
      toDate: { gte: dateEpoch },
    },
  });

  return approvedLeaves.length > 0;
};

/**
 * Get all leave requests within a date range
 */
export const getLeaveRequestsByDateRangeService = async (
  fromDate: bigint,
  toDate: bigint,
  status?: LeaveRequestStatus
) => {
  return prisma.leaveRequest.findMany({
    where: {
      ...(status && { status }),
      OR: [
        // Leave starts within range
        {
          fromDate: { gte: fromDate, lte: toDate },
        },
        // Leave ends within range
        {
          toDate: { gte: fromDate, lte: toDate },
        },
        // Leave spans entire range
        {
          fromDate: { lte: fromDate },
          toDate: { gte: toDate },
        },
      ],
    },
    include: {
      employee: {
        select: {
          employeeId: true,
          fullName: true,
          emailAddress: true,
          assignedRole: true,
        },
      },
    },
    orderBy: { fromDate: "asc" },
  });
};
