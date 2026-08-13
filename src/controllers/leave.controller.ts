import { Request, Response } from "express";
import { LeaveType, LeaveRequestStatus } from "@prisma/client";
import {
  getOrCreateLeavePolicyService,
  getLeavePolicyByYearService,
  updateLeavePolicyService,
  initializeLeaveBalancesService,
  getAllLeaveBalancesService,
  createLeaveRequestService,
  getLeaveRequestsByEmployeeService,
  getPendingLeaveRequestsForManagerService,
  getLeaveRequestByIdService,
  approveLeaveRequestService,
  rejectLeaveRequestService,
  cancelLeaveRequestService,
  getLeaveRequestsByDateRangeService,
} from "../services/leave.service";
import {
  createLeavePolicySchema,
  updateLeavePolicySchema,
  initializeLeaveBalancesSchema,
  getLeaveBalanceSchema,
  createLeaveRequestSchema,
  getLeaveRequestsSchema,
  approveLeaveRequestSchema,
  rejectLeaveRequestSchema,
  cancelLeaveRequestSchema,
  calculateWorkingDays,
  dateStringToEpoch,
  isPastDate,
  meetsNoticeRequirement,
} from "../validations/leave.validation";

// Helper to serialize BigInt fields
const serializeBigInt = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "bigint") return obj.toString();
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (typeof obj === "object") {
    const serialized: any = {};
    for (const key in obj) {
      serialized[key] = serializeBigInt(obj[key]);
    }
    return serialized;
  }
  return obj;
};

// ============================================================================
// LEAVE POLICY CONTROLLERS
// ============================================================================

export const getLeavePolicy = async (req: Request, res: Response) => {
  try {
    const yearParam = req.params.year;
    const year = typeof yearParam === 'string' ? parseInt(yearParam) : new Date().getFullYear();

    const policy = await getOrCreateLeavePolicyService(year);

    res.status(200).json(serializeBigInt(policy));
  } catch (error: any) {
    console.error("Error getting leave policy:", error);
    res.status(500).json({ message: error.message });
  }
};

export const updateLeavePolicy = async (req: Request, res: Response) => {
  try {
    const yearParam = req.params.year;
    const year = typeof yearParam === 'string' ? parseInt(yearParam) : new Date().getFullYear();
    const result = updateLeavePolicySchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.flatten(),
      });
    }

    const policy = await updateLeavePolicyService(year, result.data);

    res.status(200).json(serializeBigInt(policy));
  } catch (error: any) {
    console.error("Error updating leave policy:", error);
    res.status(500).json({ message: error.message });
  }
};

// ============================================================================
// LEAVE BALANCE CONTROLLERS
// ============================================================================

export const initializeLeaveBalances = async (req: Request, res: Response) => {
  try {
    const result = initializeLeaveBalancesSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.flatten(),
      });
    }

    const { employeeId, year } = result.data;
    const balances = await initializeLeaveBalancesService(
      BigInt(employeeId),
      year
    );

    res.status(201).json(serializeBigInt(balances));
  } catch (error: any) {
    console.error("Error initializing leave balances:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getLeaveBalances = async (req: Request, res: Response) => {
  try {
    const employeeIdParam = req.params.employeeId;
    const employeeId = typeof employeeIdParam === 'string' ? employeeIdParam : '';
    const yearParam = req.query.year;
    const year = yearParam && typeof yearParam === 'string' 
      ? parseInt(yearParam) 
      : new Date().getFullYear();

    if (!employeeId || !/^\d+$/.test(employeeId)) {
      return res.status(400).json({ message: "Invalid employee ID" });
    }

    const balances = await getAllLeaveBalancesService(BigInt(employeeId), year);

    res.status(200).json(serializeBigInt(balances));
  } catch (error: any) {
    console.error("Error getting leave balances:", error);
    res.status(500).json({ message: error.message });
  }
};

// ============================================================================
// LEAVE REQUEST CONTROLLERS
// ============================================================================
// HELPER FUNCTIONS FOR LEAVE REQUEST VALIDATION
// ============================================================================

const validatePastDate = (fromDate: string, leaveType: LeaveType): { valid: boolean; message?: string } => {
  if (!isPastDate(fromDate)) {
    return { valid: true };
  }

  if (leaveType === LeaveType.Sick) {
    const leaveDate = new Date(fromDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - leaveDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 7) {
      return { valid: false, message: "Sick leave can only be backdated up to 7 days" };
    }
    return { valid: true };
  }
  
  return { valid: false, message: "Cannot apply for leave on past dates" };
};

const validateLeaveBalance = (balance: any, totalDays: number, balanceType: LeaveType): { valid: boolean; message?: string } => {
  if (!balance) {
    return { valid: false, message: `Leave balance not found for type: ${balanceType}` };
  }

  if (Number(balance.totalAvailable) < totalDays) {
    return { 
      valid: false, 
      message: `Insufficient leave balance. Available: ${balance.totalAvailable} days, Requested: ${totalDays} days` 
    };
  }

  return { valid: true };
};

const validateNoticeRequirement = async (fromDate: string, leaveType: LeaveType, year: number): Promise<{ valid: boolean; message?: string }> => {
  if (leaveType === LeaveType.Sick) {
    return { valid: true }; // Skip notice requirement for sick leave
  }

  const policy = await getOrCreateLeavePolicyService(year);
  const minNotice = leaveType === LeaveType.Privilege 
    ? policy.minNoticePrivilege 
    : policy.minNoticeFlexi;

  if (!meetsNoticeRequirement(fromDate, minNotice)) {
    return { 
      valid: false, 
      message: `Leave request must be submitted at least ${minNotice} days in advance` 
    };
  }

  return { valid: true };
};

const validateConsecutiveDays = async (totalDays: number, leaveType: LeaveType, year: number): Promise<{ valid: boolean; message?: string }> => {
  const policy = await getOrCreateLeavePolicyService(year);
  const maxConsecutive = leaveType === LeaveType.Privilege 
    ? policy.maxConsecutivePrivilege 
    : policy.maxConsecutiveFlexi;

  if (totalDays > maxConsecutive) {
    return { 
      valid: false, 
      message: `Cannot apply for more than ${maxConsecutive} consecutive days for ${leaveType} leave` 
    };
  }

  return { valid: true };
};

const mapLeaveTypeToBalance = (leaveType: LeaveType): LeaveType => {
  if (leaveType === LeaveType.Sick || leaveType === LeaveType.Paternity) {
    return LeaveType.Casual; // All flexi types share same balance
  }
  return leaveType;
};

// ============================================================================
// LEAVE REQUEST CONTROLLER
// ============================================================================

export const createLeaveRequest = async (req: Request, res: Response) => {
  try {
    const result = createLeaveRequestSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.flatten(),
      });
    }

    const data = result.data;

    // Validate past date
    const pastDateValidation = validatePastDate(data.fromDate, data.leaveType);
    if (!pastDateValidation.valid) {
      return res.status(400).json({ message: pastDateValidation.message });
    }

    // Calculate total days
    const fromDate = new Date(data.fromDate);
    const toDate = new Date(data.toDate);
    const totalDays = calculateWorkingDays(fromDate, toDate, data.isHalfDay);

    if (totalDays === 0) {
      return res.status(400).json({
        message: "Leave request falls entirely on weekends",
      });
    }

    // Check leave balance
    const year = fromDate.getFullYear();
    const balances = await getAllLeaveBalancesService(BigInt(data.employeeId), year);
    const balanceType = mapLeaveTypeToBalance(data.leaveType);
    const balance = balances.find((b) => b.leaveType === balanceType);

    const balanceValidation = validateLeaveBalance(balance, totalDays, balanceType);
    if (!balanceValidation.valid) {
      return res.status(400).json({ message: balanceValidation.message });
    }

    // Validate notice requirement
    const noticeValidation = await validateNoticeRequirement(data.fromDate, data.leaveType, year);
    if (!noticeValidation.valid) {
      return res.status(400).json({ message: noticeValidation.message });
    }

    // Validate consecutive days
    const consecutiveValidation = await validateConsecutiveDays(totalDays, data.leaveType, year);
    if (!consecutiveValidation.valid) {
      return res.status(400).json({ message: consecutiveValidation.message });
    }

    // Create leave request
    const leaveRequest = await createLeaveRequestService({
      employeeId: BigInt(data.employeeId),
      leaveType: data.leaveType,
      fromDate: dateStringToEpoch(data.fromDate),
      toDate: dateStringToEpoch(data.toDate),
      isHalfDay: data.isHalfDay,
      halfDayPeriod: data.halfDayPeriod || null,
      totalDays,
      reason: data.reason,
      contactNumber: data.contactNumber || null,
      emergencyContact: data.emergencyContact || null,
      attachmentUrl: data.attachmentUrl || null,
      attachmentFileName: data.attachmentFileName || null,
    });

    res.status(201).json(serializeBigInt(leaveRequest));
  } catch (error: any) {
    console.error("Error creating leave request:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getLeaveRequests = async (req: Request, res: Response) => {
  try {
    const employeeIdParam = req.query.employeeId;
    const employeeId = typeof employeeIdParam === 'string' ? employeeIdParam : undefined;
    const statusParam = req.query.status;
    const status = typeof statusParam === 'string' ? statusParam as LeaveRequestStatus : undefined;

    if (employeeId) {
      // Get leave requests for specific employee
      if (!/^\d+$/.test(employeeId)) {
        return res.status(400).json({ message: "Invalid employee ID" });
      }

      const requests = await getLeaveRequestsByEmployeeService(
        BigInt(employeeId),
        status
      );
      return res.status(200).json(serializeBigInt(requests));
    }

    // Get all leave requests by date range (admin/manager view)
    const fromDateParam = req.query.fromDate;
    const toDateParam = req.query.toDate;
    const fromDate = typeof fromDateParam === 'string' ? fromDateParam : undefined;
    const toDate = typeof toDateParam === 'string' ? toDateParam : undefined;

    if (fromDate && toDate) {
      const requests = await getLeaveRequestsByDateRangeService(
        dateStringToEpoch(fromDate),
        dateStringToEpoch(toDate),
        status
      );
      return res.status(200).json(serializeBigInt(requests));
    }

    res.status(400).json({
      message: "Either employeeId or date range (fromDate + toDate) is required",
    });
  } catch (error: any) {
    console.error("Error getting leave requests:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getLeaveRequestById = async (req: Request, res: Response) => {
  try {
    const leaveRequestIdParam = req.params.id;
    const leaveRequestId = typeof leaveRequestIdParam === 'string' ? leaveRequestIdParam : '';

    if (!/^\d+$/.test(leaveRequestId)) {
      return res.status(400).json({ message: "Invalid leave request ID" });
    }

    const leaveRequest = await getLeaveRequestByIdService(
      BigInt(leaveRequestId)
    );

    if (!leaveRequest) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    res.status(200).json(serializeBigInt(leaveRequest));
  } catch (error: any) {
    console.error("Error getting leave request:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getPendingLeaveRequestsForManager = async (
  req: Request,
  res: Response
) => {
  try {
    const managerIdParam = req.params.managerId;
    const managerId = typeof managerIdParam === 'string' ? managerIdParam : '';

    if (!/^\d+$/.test(managerId)) {
      return res.status(400).json({ message: "Invalid manager ID" });
    }

    const requests = await getPendingLeaveRequestsForManagerService(
      BigInt(managerId)
    );

    res.status(200).json(serializeBigInt(requests));
  } catch (error: any) {
    console.error("Error getting pending leave requests:", error);
    res.status(500).json({ message: error.message });
  }
};

export const approveLeaveRequest = async (req: Request, res: Response) => {
  try {
    const result = approveLeaveRequestSchema.safeParse({
      leaveRequestId: req.params.id,
      ...req.body,
    });

    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.flatten(),
      });
    }

    const { leaveRequestId, reviewedById, reviewComments } = result.data;

    const updatedRequest = await approveLeaveRequestService(
      BigInt(leaveRequestId),
      BigInt(reviewedById),
      reviewComments
    );

    res.status(200).json(serializeBigInt(updatedRequest));
  } catch (error: any) {
    console.error("Error approving leave request:", error);
    res.status(500).json({ message: error.message });
  }
};

export const rejectLeaveRequest = async (req: Request, res: Response) => {
  try {
    const result = rejectLeaveRequestSchema.safeParse({
      leaveRequestId: req.params.id,
      ...req.body,
    });

    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.flatten(),
      });
    }

    const { leaveRequestId, reviewedById, reviewComments } = result.data;

    const updatedRequest = await rejectLeaveRequestService(
      BigInt(leaveRequestId),
      BigInt(reviewedById),
      reviewComments
    );

    res.status(200).json(serializeBigInt(updatedRequest));
  } catch (error: any) {
    console.error("Error rejecting leave request:", error);
    res.status(500).json({ message: error.message });
  }
};

export const cancelLeaveRequest = async (req: Request, res: Response) => {
  try {
    const result = cancelLeaveRequestSchema.safeParse({
      leaveRequestId: req.params.id,
      ...req.body,
    });

    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.flatten(),
      });
    }

    const { leaveRequestId, employeeId, cancellationReason } = result.data;

    const updatedRequest = await cancelLeaveRequestService(
      BigInt(leaveRequestId),
      BigInt(employeeId),
      cancellationReason
    );

    res.status(200).json(serializeBigInt(updatedRequest));
  } catch (error: any) {
    console.error("Error cancelling leave request:", error);
    res.status(500).json({ message: error.message });
  }
};
