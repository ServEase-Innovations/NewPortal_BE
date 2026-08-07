import { z } from "zod";

// Helper: Validate that a string is a positive integer
const positiveIntegerString = z.string().trim().min(1, "Value is required").refine(
  (val) => {
    const num = Number.parseInt(val, 10);
    return !Number.isNaN(num) && num > 0 && Number.isInteger(num) && val === num.toString();
  },
  { message: "Must be a positive integer" }
);

// Helper: Validate epoch milliseconds timestamp
// Valid range: Jan 1, 2000 (946684800000) to Dec 31, 2099 (4102444800000)
const epochMilliseconds = z.number().int().refine(
  (val) => val >= 946684800000 && val <= 4102444800000,
  { message: "Must be a valid epoch milliseconds timestamp between 2000-2099" }
);

// Create schema with comprehensive validation
export const createAttendanceSchema = z.object({
  employeeId: positiveIntegerString,
  
  calendarDate: epochMilliseconds,
  
  shiftStatus: z.enum(["Working", "OnLeave", "Absent"]),
  
  clockInTimestamp: epochMilliseconds.optional(),
  
  clockOutTimestamp: epochMilliseconds.optional(),
  
  // totalHoursComputed is server-calculated, not accepted from client
  totalHoursComputed: z.number().optional(),
})
.superRefine((data, ctx) => {
  // Rule 1: "Working" status MUST have clockInTimestamp
  if (data.shiftStatus === "Working" && !data.clockInTimestamp) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Clock-in timestamp is required for 'Working' status",
      path: ["clockInTimestamp"],
    });
  }
  
  // Rule 2: "OnLeave" and "Absent" MUST NOT have clock timestamps
  if ((data.shiftStatus === "OnLeave" || data.shiftStatus === "Absent") && 
      (data.clockInTimestamp || data.clockOutTimestamp)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `'${data.shiftStatus}' status cannot have clock-in or clock-out timestamps`,
      path: ["shiftStatus"],
    });
  }
  
  // Rule 3: If both timestamps provided, clockOut must be after clockIn
  if (data.clockInTimestamp && data.clockOutTimestamp) {
    if (data.clockOutTimestamp <= data.clockInTimestamp) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Clock-out time must be after clock-in time",
        path: ["clockOutTimestamp"],
      });
    }
    
    // Rule 4: Session duration must be reasonable (max 24 hours)
    const durationMs = data.clockOutTimestamp - data.clockInTimestamp;
    const maxDurationMs = 24 * 60 * 60 * 1000; // 24 hours
    if (durationMs > maxDurationMs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Session duration cannot exceed 24 hours",
        path: ["clockOutTimestamp"],
      });
    }
  }
  
  // Rule 5: Ignore client-provided totalHoursComputed (server calculates it)
  // This is handled by removing it from the DTO in the controller
});

// Update schema with stricter validation
export const updateAttendanceSchema = z.object({
  shiftStatus: z.enum(["Working", "OnLeave", "Absent"]).optional(),
  
  clockInTimestamp: epochMilliseconds.optional(),
  
  // Allow null for "resume work" functionality
  clockOutTimestamp: epochMilliseconds.nullable().optional(),
  
  // totalHoursComputed is server-calculated, should not be accepted from client
  totalHoursComputed: z.number().optional(),
})
.superRefine((data, ctx) => {
  // Rule 1: Require at least one field to update
  if (!data.shiftStatus && 
      data.clockInTimestamp === undefined && 
      data.clockOutTimestamp === undefined &&
      data.totalHoursComputed === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one field must be provided for update",
      path: [],
    });
  }
  
  // Rule 2: If both timestamps provided in the update, validate order
  if (data.clockInTimestamp && data.clockOutTimestamp && data.clockOutTimestamp !== null) {
    if (data.clockOutTimestamp <= data.clockInTimestamp) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Clock-out time must be after clock-in time",
        path: ["clockOutTimestamp"],
      });
    }
    
    // Validate reasonable duration
    const durationMs = data.clockOutTimestamp - data.clockInTimestamp;
    const maxDurationMs = 24 * 60 * 60 * 1000;
    if (durationMs > maxDurationMs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Session duration cannot exceed 24 hours",
        path: ["clockOutTimestamp"],
      });
    }
  }
  
  // Note: Cross-validation with existing record (e.g., clockOut without clockIn)
  // is handled in the controller after fetching the existing record
});