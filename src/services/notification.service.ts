import prisma from "../prisma";
import { NotificationType } from "@prisma/client";

/**
 * Create a notification for an employee
 */
export const createNotification = async (
  employeeId: bigint,
  title: string,
  detail: string,
  type: NotificationType,
  actionUrl?: string,
  actionLabel?: string,
  expiresAt?: bigint
) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        employeeId,
        title,
        detail,
        type,
        actionUrl,
        actionLabel,
        createdAt: BigInt(Date.now()),
        expiresAt,
      },
    });

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

/**
 * Create notification for leave request approved
 */
export const notifyLeaveApproved = async (
  employeeId: bigint,
  employeeName: string,
  leaveType: string,
  fromDate: string,
  toDate: string,
  totalDays: number,
  approvedByName: string,
  leaveRequestId: bigint
) => {
  const title = "Leave Request Approved ✓";
  const detail = `Your ${leaveType} leave request for ${totalDays} day(s) from ${fromDate} to ${toDate} has been approved by ${approvedByName}.`;
  
  return createNotification(
    employeeId,
    title,
    detail,
    NotificationType.Success,
    `/leave?tab=history&id=${leaveRequestId}`,
    "View Details"
  );
};

/**
 * Create notification for leave request rejected
 */
export const notifyLeaveRejected = async (
  employeeId: bigint,
  employeeName: string,
  leaveType: string,
  fromDate: string,
  toDate: string,
  totalDays: number,
  rejectedByName: string,
  rejectionReason: string,
  leaveRequestId: bigint
) => {
  const title = "Leave Request Rejected";
  const detail = `Your ${leaveType} leave request for ${totalDays} day(s) from ${fromDate} to ${toDate} has been rejected by ${rejectedByName}. Reason: ${rejectionReason}`;
  
  return createNotification(
    employeeId,
    title,
    detail,
    NotificationType.Error,
    `/leave?tab=history&id=${leaveRequestId}`,
    "View Details"
  );
};

/**
 * Create notification for pending leave approval (for manager)
 */
export const notifyManagerNewLeaveRequest = async (
  managerId: bigint,
  employeeName: string,
  leaveType: string,
  fromDate: string,
  toDate: string,
  totalDays: number,
  leaveRequestId: bigint
) => {
  const title = "New Leave Request";
  const detail = `${employeeName} has submitted a ${leaveType} leave request for ${totalDays} day(s) from ${fromDate} to ${toDate}. Please review.`;
  
  return createNotification(
    managerId,
    title,
    detail,
    NotificationType.Warning,
    `/leave?tab=approvals&id=${leaveRequestId}`,
    "Review Request"
  );
};

/**
 * Create notification for attendance reminder
 */
export const notifyAttendanceReminder = async (
  employeeId: bigint,
  employeeName: string
) => {
  const title = "Attendance Reminder";
  const detail = "Don't forget to clock in for today. Have a productive day!";
  
  // Expires in 12 hours
  const expiresAt = BigInt(Date.now() + 12 * 60 * 60 * 1000);
  
  return createNotification(
    employeeId,
    title,
    detail,
    NotificationType.Info,
    "/attendance",
    "Clock In",
    expiresAt
  );
};

/**
 * Create notification for timesheet submission reminder
 */
export const notifyTimesheetReminder = async (
  employeeId: bigint,
  employeeName: string,
  date: string
) => {
  const title = "Timesheet Reminder";
  const detail = `Please submit your daily task update for ${date}.`;
  
  // Expires in 24 hours
  const expiresAt = BigInt(Date.now() + 24 * 60 * 60 * 1000);
  
  return createNotification(
    employeeId,
    title,
    detail,
    NotificationType.Warning,
    "/daily-tasks",
    "Submit Timesheet",
    expiresAt
  );
};

/**
 * Create notification for payslip generated
 */
export const notifyPayslipGenerated = async (
  employeeId: bigint,
  employeeName: string,
  month: string,
  year: number,
  payslipId: bigint
) => {
  const title = "Payslip Available";
  const detail = `Your payslip for ${month} ${year} is now available for viewing.`;
  
  return createNotification(
    employeeId,
    title,
    detail,
    NotificationType.Info,
    `/payslips?id=${payslipId}`,
    "View Payslip"
  );
};

/**
 * Create notification for daily task submission approved
 */
export const notifyDailyTaskApproved = async (
  employeeId: bigint,
  employeeName: string,
  submissionDate: string,
  dailyTaskId: bigint
) => {
  const title = "Daily Task Approved";
  const detail = `Your daily task submission for ${submissionDate} has been approved.`;
  
  return createNotification(
    employeeId,
    title,
    detail,
    NotificationType.Success,
    `/daily-tasks?id=${dailyTaskId}`,
    "View Details"
  );
};

/**
 * Create notification for team assignment
 */
export const notifyTeamAssignment = async (
  employeeId: bigint,
  employeeName: string,
  teamName: string,
  projectTitle: string,
  teamId: string
) => {
  const title = "Team Assignment";
  const detail = `You have been assigned to ${teamName} for the project: ${projectTitle}.`;
  
  return createNotification(
    employeeId,
    title,
    detail,
    NotificationType.Info,
    `/my-team`,
    "View Team"
  );
};

/**
 * Create notification for manager assignment
 */
export const notifyManagerAssignment = async (
  employeeId: bigint,
  employeeName: string,
  managerName: string
) => {
  const title = "Manager Assigned";
  const detail = `${managerName} is now your reporting manager.`;
  
  return createNotification(
    employeeId,
    title,
    detail,
    NotificationType.Info,
    `/my-team`,
    "View Hierarchy"
  );
};

/**
 * Create welcome notification for new employee
 */
export const notifyWelcomeEmployee = async (
  employeeId: bigint,
  employeeName: string
) => {
  const title = "Welcome to the Team! 🎉";
  const detail = `Hi ${employeeName}! Welcome aboard. Explore the portal to manage your attendance, leaves, timesheets, and more.`;
  
  return createNotification(
    employeeId,
    title,
    detail,
    NotificationType.Success,
    "/dashboard",
    "Get Started"
  );
};

/**
 * Create notification for system announcement
 */
export const notifySystemAnnouncement = async (
  employeeId: bigint,
  title: string,
  detail: string,
  actionUrl?: string,
  actionLabel?: string
) => {
  return createNotification(
    employeeId,
    title,
    detail,
    NotificationType.Info,
    actionUrl,
    actionLabel
  );
};

/**
 * Bulk create notifications for multiple employees
 */
export const createBulkNotifications = async (
  employeeIds: bigint[],
  title: string,
  detail: string,
  type: NotificationType,
  actionUrl?: string,
  actionLabel?: string,
  expiresAt?: bigint
) => {
  try {
    const notifications = employeeIds.map((employeeId) => ({
      employeeId,
      title,
      detail,
      type,
      actionUrl,
      actionLabel,
      createdAt: BigInt(Date.now()),
      expiresAt,
    }));

    const result = await prisma.notification.createMany({
      data: notifications,
    });

    return result;
  } catch (error) {
    console.error("Error creating bulk notifications:", error);
    throw error;
  }
};

/**
 * Delete expired notifications (cleanup job)
 */
export const deleteExpiredNotifications = async () => {
  try {
    const now = BigInt(Date.now());
    
    const result = await prisma.notification.deleteMany({
      where: {
        expiresAt: {
          lte: now,
        },
      },
    });

    console.log(`Deleted ${result.count} expired notifications`);
    return result;
  } catch (error) {
    console.error("Error deleting expired notifications:", error);
    throw error;
  }
};
