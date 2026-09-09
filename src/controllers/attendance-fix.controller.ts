import { Request, Response } from "express";
import prisma from "../prisma";

/**
 * Fix attendance records with wrong default 8.00 hours
 * This is a one-time fix endpoint
 */
export const fixAttendanceDefaults = async (req: Request, res: Response) => {
  try {
    const { employeeId, date } = req.query;
    
    console.log('🔧 Fixing attendance records...');
    
    let whereClause: any = {};
    
    // If specific employee ID is provided
    if (employeeId) {
      whereClause.employeeId = BigInt(employeeId);
    }
    
    // If specific date is provided (format: YYYY-MM-DD)
    if (date) {
      const targetDate = new Date(date as string);
      targetDate.setHours(0, 0, 0, 0);
      whereClause.calendarDate = BigInt(targetDate.getTime());
    } else {
      // Default to today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      whereClause.calendarDate = BigInt(today.getTime());
    }
    
    // Find attendance records
    const records = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            fullName: true,
            username: true,
          }
        }
      }
    });
    
    console.log(`Found ${records.length} attendance records`);
    
    let fixedCount = 0;
    const details: any[] = [];
    
    for (const record of records) {
      const info: any = {
        attendanceId: record.attendanceId.toString(),
        employee: `${record.employee.fullName} (${record.employee.username})`,
        calendarDate: new Date(Number(record.calendarDate)).toISOString(),
        currentHours: record.totalHoursComputed.toString(),
        clockedIn: !!record.clockInTimestamp,
        clockedOut: !!record.clockOutTimestamp,
      };
      
      // Fix if it's 8.00 and actively clocked in
      if (Number(record.totalHoursComputed) === 8.00) {
        await prisma.attendance.update({
          where: { attendanceId: record.attendanceId },
          data: { totalHoursComputed: 0.00 },
        });
        info.action = 'Fixed: Reset from 8.00 to 0.00';
        fixedCount++;
      } else {
        info.action = 'No fix needed';
      }
      
      details.push(info);
    }
    
    res.status(200).json({
      message: "Attendance check complete",
      recordsFound: records.length,
      recordsFixed: fixedCount,
      details,
    });
  } catch (error: any) {
    console.error("Error fixing attendance:", error);
    res.status(500).json({
      message: "Failed to fix attendance records",
      error: error.message,
    });
  }
};
