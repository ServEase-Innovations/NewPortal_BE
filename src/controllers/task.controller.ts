import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { TaskStatus } from "@prisma/client";

import {
  createTaskService,
  listTasksService,
  updateTaskService,
  updateOwnTaskStatusService,
  deleteTaskService,
  TaskNotFoundError,
  InvalidTaskAssigneeError,
  TaskAccessError,
} from "../services/task.service";
import {
  TeamNotFoundError,
  TeamAccessError,
  EmployeeNotFoundError,
  ValidationError,
  Requester,
} from "../services/team.service";

import {
  createTaskSchema,
  updateTaskSchema,
  updateOwnTaskStatusSchema,
} from "../validations/task.validation";

const serializeTask = (task: any) => {
  if (!task) return null;
  return {
    ...task,
    taskId: task.taskId.toString(),
    assignedToId: task.assignedToId ? task.assignedToId.toString() : null,
    createdById: task.createdById.toString(),
    dueDate: task.dueDate ? new Date(Number(task.dueDate)).toISOString() : null,
    completedAt: task.completedAt ? new Date(Number(task.completedAt)).toISOString() : null,
    createdAt: task.createdAt ? new Date(Number(task.createdAt)).toISOString() : null,
    updatedAt: task.updatedAt ? new Date(Number(task.updatedAt)).toISOString() : null,
    assignedTo: task.assignedTo
      ? { ...task.assignedTo, employeeId: task.assignedTo.employeeId.toString() }
      : null,
    createdBy: task.createdBy
      ? { ...task.createdBy, employeeId: task.createdBy.employeeId.toString() }
      : undefined,
  };
};

const serializeTasks = (tasks: any[]) => tasks.map(serializeTask);

const getRequester = (req: AuthRequest): Requester => ({
  employeeId: BigInt(req.employee!.employeeId),
  assignedRole: req.employee!.assignedRole,
});

const handleServiceError = (res: Response, error: unknown) => {
  if (error instanceof TeamNotFoundError || error instanceof TaskNotFoundError) {
    return res.status(404).json({ message: error.message });
  }
  if (error instanceof TeamAccessError || error instanceof TaskAccessError) {
    return res.status(403).json({ message: error.message });
  }
  if (error instanceof InvalidTaskAssigneeError) {
    return res.status(400).json({ message: error.message });
  }
  if (error instanceof EmployeeNotFoundError) {
    return res.status(404).json({ message: error.message });
  }
  if (error instanceof ValidationError) {
    return res.status(400).json({ message: error.message });
  }
  console.error("❌ Task error:", error instanceof Error ? error.stack : error);
  return res.status(500).json({
    message: "Something went wrong",
    ...(process.env.NODE_ENV !== "production" && error instanceof Error
      ? { detail: error.message }
      : {}),
  });
};

export const createTask = async (req: AuthRequest<{ teamId: string }>, res: Response) => {
  try {
    const result = createTaskSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Validation failed", errors: result.error.flatten() });
    }

    const task = await createTaskService(req.params.teamId, result.data, getRequester(req));
    res.status(201).json(serializeTask(task));
  } catch (error) {
    handleServiceError(res, error);
  }
};

export const getTasks = async (req: AuthRequest<{ teamId: string }>, res: Response) => {
  try {
    const statusFilter = req.query.status as string | undefined;
    const assigneeFilter = req.query.assignedToId as string | undefined;

    if (statusFilter && !Object.values(TaskStatus).includes(statusFilter as TaskStatus)) {
      return res.status(400).json({ message: "Invalid status filter" });
    }
    if (assigneeFilter && !/^\d+$/.test(assigneeFilter)) {
      return res.status(400).json({ message: "Invalid assignedToId filter" });
    }

    const tasks = await listTasksService(req.params.teamId, getRequester(req), {
      status: statusFilter as TaskStatus | undefined,
      assignedToId: assigneeFilter ? BigInt(assigneeFilter) : undefined,
    });

    res.json(serializeTasks(tasks));
  } catch (error) {
    handleServiceError(res, error);
  }
};

export const updateTask = async (req: AuthRequest<{ teamId: string; taskId: string }>, res: Response) => {
  try {
    if (!/^\d+$/.test(req.params.taskId)) {
      return res.status(400).json({ message: "Invalid taskId" });
    }

    const result = updateTaskSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Validation failed", errors: result.error.flatten() });
    }

    const task = await updateTaskService(
      req.params.teamId,
      BigInt(req.params.taskId),
      result.data,
      getRequester(req)
    );

    res.json(serializeTask(task));
  } catch (error) {
    handleServiceError(res, error);
  }
};

// PATCH /teams/:teamId/tasks/:taskId/status - self-service status update for
// the employee the task is assigned to (manager/admin may also use it).
export const updateTaskStatus = async (req: AuthRequest<{ teamId: string; taskId: string }>, res: Response) => {
  try {
    if (!/^\d+$/.test(req.params.taskId)) {
      return res.status(400).json({ message: "Invalid taskId" });
    }

    const result = updateOwnTaskStatusSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Validation failed", errors: result.error.flatten() });
    }

    const task = await updateOwnTaskStatusService(
      req.params.teamId,
      BigInt(req.params.taskId),
      result.data.status,
      getRequester(req)
    );

    res.json(serializeTask(task));
  } catch (error) {
    handleServiceError(res, error);
  }
};

export const deleteTask = async (req: AuthRequest<{ teamId: string; taskId: string }>, res: Response) => {
  try {
    if (!/^\d+$/.test(req.params.taskId)) {
      return res.status(400).json({ message: "Invalid taskId" });
    }

    await deleteTaskService(req.params.teamId, BigInt(req.params.taskId), getRequester(req));
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    handleServiceError(res, error);
  }
};
