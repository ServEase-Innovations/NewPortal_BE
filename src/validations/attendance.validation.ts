import { z } from "zod";

export const createAttendanceSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),

  calendarDate: z.iso.datetime(),

  shiftStatus: z.enum([
    "Working",
    "OnLeave",
    "Absent",
  ]),

  clockInTimestamp: z.iso.datetime().optional(),

  clockOutTimestamp: z.iso.datetime().optional(),

  totalHoursComputed: z.number().min(0),
});

export const updateAttendanceSchema = z.object({
  shiftStatus: z.enum([
    "Working",
    "OnLeave",
    "Absent",
  ]).optional(),

  clockInTimestamp: z.string().optional(),

  clockOutTimestamp: z.string().optional(),

  totalHoursComputed: z.number().min(0).optional(),
});