import { z } from "zod";
import { TaskStatus, TaskPriority } from "@prisma/client";

const employeeIdSchema = z.coerce
  .bigint({ message: "assignedToId must be a valid numeric employee ID" })
  .positive("assignedToId must be a positive number");

export const createTaskSchema = z.object({
  title: z.string().min(3, "Task title must be at least 3 characters"),
  description: z.string().optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  dueDate: z.coerce.date().optional(),
  // Null explicitly leaves the task unassigned (backlog); omitted also means
  // unassigned. Provided means "assign to this team member".
  assignedToId: employeeIdSchema.nullable().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(3, "Task title must be at least 3 characters").optional(),
  description: z.string().nullable().optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  dueDate: z.coerce.date().nullable().optional(),
  assignedToId: employeeIdSchema.nullable().optional(),
});

// A team member updating their own task may only move its status - they
// cannot reassign it, re-prioritize it, or edit its content.
export const updateOwnTaskStatusSchema = z.object({
  status: z.nativeEnum(TaskStatus),
});
