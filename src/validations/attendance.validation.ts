import { z } from "zod";

export const createAttendanceSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),

  calendarDate: z.number().int().positive(),

  shiftStatus: z.enum([
    "Working",
    "OnLeave",
    "Absent",
  ]),

  clockInTimestamp: z.number().int().positive().optional(),

  clockOutTimestamp: z.number().int().positive().optional(),

  totalHoursComputed: z.number().min(0),
});

export const updateAttendanceSchema = z.object({
  shiftStatus: z.enum([
    "Working",
    "OnLeave",
    "Absent",
  ]).optional(),

  clockInTimestamp: z.number().int().positive().optional(),

  clockOutTimestamp: z.number().int().positive().optional(),

  totalHoursComputed: z.number().min(0).optional(),
});