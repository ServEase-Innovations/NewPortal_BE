import { z } from "zod";
import { LeaveType, LeaveRequestStatus } from "@prisma/client";

// ============================================================================
// LEAVE POLICY VALIDATION
// ============================================================================

export const createLeavePolicySchema = z.object({
  year: z.number().int().min(2020).max(2100),
  privilegeLeaveDays: z.number().min(0).max(365).optional().default(18),
  flexiLeaveDays: z.number().min(0).max(365).optional().default(6),
  maternityLeaveDays: z.number().min(0).max(365).optional().default(182),
  compOffLeaveDays: z.number().min(0).max(365).optional().default(0),
  carryForwardAllowed: z.boolean().optional().default(true),
  maxCarryForwardDays: z.number().min(0).max(365).optional().default(5),
  encashmentAllowed: z.boolean().optional().default(false),
  maxEncashmentDays: z.number().min(0).max(365).optional().default(0),
  minNoticePrivilege: z.number().int().min(0).max(90).optional().default(7),
  minNoticeFlexi: z.number().int().min(0).max(30).optional().default(1),
  maxConsecutivePrivilege: z.number().int().min(1).max(90).optional().default(15),
  maxConsecutiveFlexi: z.number().int().min(1).max(30).optional().default(5),
  halfDayLeaveAllowed: z.boolean().optional().default(true),
  createdByHR: z.string().optional(),
});

export const updateLeavePolicySchema = z.object({
  privilegeLeaveDays: z.number().min(0).max(365).optional(),
  flexiLeaveDays: z.number().min(0).max(365).optional(),
  maternityLeaveDays: z.number().min(0).max(365).optional(),
  compOffLeaveDays: z.number().min(0).max(365).optional(),
  carryForwardAllowed: z.boolean().optional(),
  maxCarryForwardDays: z.number().min(0).max(365).optional(),
  encashmentAllowed: z.boolean().optional(),
  maxEncashmentDays: z.number().min(0).max(365).optional(),
  minNoticePrivilege: z.number().int().min(0).max(90).optional(),
  minNoticeFlexi: z.number().int().min(0).max(30).optional(),
  maxConsecutivePrivilege: z.number().int().min(1).max(90).optional(),
  maxConsecutiveFlexi: z.number().int().min(1).max(30).optional(),
  halfDayLeaveAllowed: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// ============================================================================
// LEAVE BALANCE VALIDATION
// ============================================================================

export const initializeLeaveBalancesSchema = z.object({
  employeeId: z.string().regex(/^\d+$/), // BigInt as string
  year: z.number().int().min(2020).max(2100),
});

export const getLeaveBalanceSchema = z.object({
  employeeId: z.string().regex(/^\d+$/),
  year: z.number().int().min(2020).max(2100),
  leaveType: z.nativeEnum(LeaveType).optional(),
});

// ============================================================================
// LEAVE REQUEST VALIDATION
// ============================================================================

export const createLeaveRequestSchema = z
  .object({
    employeeId: z.string().regex(/^\d+$/), // BigInt as string
    leaveType: z.nativeEnum(LeaveType),
    fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
    toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    isHalfDay: z.boolean().optional().default(false),
    halfDayPeriod: z.enum(["FirstHalf", "SecondHalf"]).optional(),
    reason: z.string().min(10).max(1000),
    contactNumber: z.string().optional(),
    emergencyContact: z.string().optional(),
    attachmentUrl: z.string().url().optional(),
    attachmentFileName: z.string().optional(),
  })
  .refine(
    (data) => {
      // If half-day, must specify period
      if (data.isHalfDay && !data.halfDayPeriod) {
        return false;
      }
      return true;
    },
    {
      message: "Half-day period must be specified for half-day leave",
      path: ["halfDayPeriod"],
    }
  )
  .refine(
    (data) => {
      // fromDate must be <= toDate
      const from = new Date(data.fromDate);
      const to = new Date(data.toDate);
      return from <= to;
    },
    {
      message: "From date must be before or equal to To date",
      path: ["toDate"],
    }
  )
  .refine(
    (data) => {
      // Half-day leave must be single day
      if (data.isHalfDay) {
        return data.fromDate === data.toDate;
      }
      return true;
    },
    {
      message: "Half-day leave must be for a single day",
      path: ["isHalfDay"],
    }
  );

export const getLeaveRequestsSchema = z.object({
  employeeId: z.string().regex(/^\d+$/).optional(),
  status: z.nativeEnum(LeaveRequestStatus).optional(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const approveLeaveRequestSchema = z.object({
  leaveRequestId: z.string().regex(/^\d+$/),
  reviewedById: z.string().regex(/^\d+$/),
  reviewComments: z.string().max(1000).optional(),
});

export const rejectLeaveRequestSchema = z.object({
  leaveRequestId: z.string().regex(/^\d+$/),
  reviewedById: z.string().regex(/^\d+$/),
  reviewComments: z.string().min(10).max(1000), // Rejection reason is required
});

export const cancelLeaveRequestSchema = z.object({
  leaveRequestId: z.string().regex(/^\d+$/),
  employeeId: z.string().regex(/^\d+$/),
  cancellationReason: z.string().min(10).max(1000),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate total days between two dates (inclusive)
 * Excludes weekends (Saturday & Sunday)
 */
export const calculateWorkingDays = (
  fromDate: Date,
  toDate: Date,
  isHalfDay: boolean = false
): number => {
  if (isHalfDay) {
    return 0.5;
  }

  let count = 0;
  const current = new Date(fromDate);

  while (current <= toDate) {
    const dayOfWeek = current.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
};

/**
 * Convert date string (YYYY-MM-DD) to epoch timestamp (start of day)
 */
export const dateStringToEpoch = (dateString: string): bigint => {
  const date = new Date(dateString);
  // Set to start of day in UTC
  date.setUTCHours(0, 0, 0, 0);
  return BigInt(date.getTime());
};

/**
 * Check if date is in the past
 */
export const isPastDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

/**
 * Check if leave request meets minimum notice requirement
 */
export const meetsNoticeRequirement = (
  fromDate: string,
  minNoticeDays: number
): boolean => {
  const leaveDate = new Date(fromDate);
  const today = new Date();
  const diffTime = leaveDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= minNoticeDays;
};
