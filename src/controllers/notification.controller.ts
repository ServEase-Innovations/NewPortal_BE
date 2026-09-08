import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import prisma from "../prisma";

// Helper to serialize BigInt fields recursively
const convertBigInt = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "bigint") return obj.toString();
  if (Array.isArray(obj)) return obj.map(convertBigInt);
  if (obj instanceof Date) return obj.toISOString();
  if (typeof obj === "object") {
    const converted: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        converted[key] = convertBigInt(obj[key]);
      }
    }
    return converted;
  }
  return obj;
};

/**
 * Get all notifications for the authenticated employee
 * GET /notifications/my-notifications
 * Query params: 
 *   - unreadOnly: boolean (optional) - if true, only return unread notifications
 *   - limit: number (optional) - max number of notifications to return (default: 50)
 */
export const getMyNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const employeeId = BigInt(req.employee!.employeeId);
    const unreadOnly = req.query.unreadOnly === "true";
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const where: any = {
      employeeId,
    };

    if (unreadOnly) {
      where.isRead = false;
    }

    // Get notifications, ordered by creation date (newest first)
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    // Count unread notifications
    const unreadCount = await prisma.notification.count({
      where: {
        employeeId,
        isRead: false,
      },
    });

    res.status(200).json({
      message: "Notifications retrieved successfully",
      notifications: convertBigInt(notifications),
      unreadCount,
      total: notifications.length,
    });
  } catch (error: any) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      message: "Failed to fetch notifications",
      error: error.message,
    });
  }
};

/**
 * Mark a single notification as read
 * PUT /notifications/:notificationId/read
 */
export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const employeeId = BigInt(req.employee!.employeeId);
    const notificationId = BigInt(req.params.notificationId);

    // Verify the notification belongs to the authenticated employee
    const notification = await prisma.notification.findFirst({
      where: {
        notificationId,
        employeeId,
      },
    });

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    // Mark as read if not already read
    if (!notification.isRead) {
      const updatedNotification = await prisma.notification.update({
        where: { notificationId },
        data: {
          isRead: true,
          readAt: BigInt(Date.now()),
        },
      });

      return res.status(200).json({
        message: "Notification marked as read",
        notification: convertBigInt(updatedNotification),
      });
    }

    res.status(200).json({
      message: "Notification already marked as read",
      notification: convertBigInt(notification),
    });
  } catch (error: any) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({
      message: "Failed to mark notification as read",
      error: error.message,
    });
  }
};

/**
 * Mark all notifications as read for the authenticated employee
 * PUT /notifications/mark-all-read
 */
export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const employeeId = BigInt(req.employee!.employeeId);
    const now = BigInt(Date.now());

    // Update all unread notifications for this employee
    const result = await prisma.notification.updateMany({
      where: {
        employeeId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: now,
      },
    });

    res.status(200).json({
      message: "All notifications marked as read",
      updatedCount: result.count,
    });
  } catch (error: any) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({
      message: "Failed to mark all notifications as read",
      error: error.message,
    });
  }
};

/**
 * Delete a notification (soft delete or permanent - we're doing permanent delete here)
 * DELETE /notifications/:notificationId
 */
export const deleteNotification = async (req: AuthRequest, res: Response) => {
  try {
    const employeeId = BigInt(req.employee!.employeeId);
    const notificationId = BigInt(req.params.notificationId);

    // Verify the notification belongs to the authenticated employee
    const notification = await prisma.notification.findFirst({
      where: {
        notificationId,
        employeeId,
      },
    });

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    // Delete the notification
    await prisma.notification.delete({
      where: { notificationId },
    });

    res.status(200).json({
      message: "Notification deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting notification:", error);
    res.status(500).json({
      message: "Failed to delete notification",
      error: error.message,
    });
  }
};

/**
 * Get unread notification count
 * GET /notifications/unread-count
 */
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const employeeId = BigInt(req.employee!.employeeId);

    const unreadCount = await prisma.notification.count({
      where: {
        employeeId,
        isRead: false,
      },
    });

    res.status(200).json({
      unreadCount,
    });
  } catch (error: any) {
    console.error("Error getting unread count:", error);
    res.status(500).json({
      message: "Failed to get unread count",
      error: error.message,
    });
  }
};
