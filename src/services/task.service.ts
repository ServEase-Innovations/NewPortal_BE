import prisma from "../prisma";
import { EmployeeRole, TaskStatus, TaskPriority } from "@prisma/client";
import { isTeamMemberRole } from "../constants/team-roles";
import { Requester, TeamNotFoundError, TeamAccessError, EmployeeNotFoundError } from "./team.service";

export class TaskNotFoundError extends Error {
  constructor(message = "Task not found") {
    super(message);
    this.name = "TaskNotFoundError";
  }
}

export class InvalidTaskAssigneeError extends Error {
  constructor(
    message = "A task can only be assigned to an active member of this team holding the Developer, Marketing, or CustomStaff role"
  ) {
    super(message);
    this.name = "InvalidTaskAssigneeError";
  }
}

export class TaskAccessError extends Error {
  constructor(message = "You do not have permission to perform this action on this task") {
    super(message);
    this.name = "TaskAccessError";
  }
}

const isPlatformAdmin = (requester: Requester) =>
  requester.assignedRole === EmployeeRole.SuperAdmin ||
  requester.assignedRole === EmployeeRole.HR;

const loadTeamOrThrow = async (teamId: string) => {
  const team = await prisma.team.findUnique({ where: { teamId } });
  if (!team) throw new TeamNotFoundError();
  return team;
};

/** Manager who owns the team, or SuperAdmin/HR - i.e. who may create/edit/delete tasks. */
const assertCanManageTasks = (team: { managerId: bigint }, requester: Requester) => {
  if (isPlatformAdmin(requester)) return;
  if (
    requester.assignedRole === EmployeeRole.Manager &&
    team.managerId === requester.employeeId
  ) {
    return;
  }
  throw new TeamAccessError(
    "Only the manager who owns this team (or a SuperAdmin/HR) may manage its tasks"
  );
};

/** Anyone who may view the team's tasks: admins, the owning manager, or a member of the team. */
const assertCanViewTasks = async (
  team: { teamId: string; managerId: bigint },
  requester: Requester
) => {
  if (isPlatformAdmin(requester)) return;
  if (
    requester.assignedRole === EmployeeRole.Manager &&
    team.managerId === requester.employeeId
  ) {
    return;
  }
  const membership = await prisma.employee.findFirst({
    where: { employeeId: requester.employeeId, teamId: team.teamId },
    select: { employeeId: true },
  });
  if (membership) return;
  throw new TeamAccessError();
};

const validateAssignee = async (teamId: string, assignedToId: bigint | null) => {
  if (assignedToId === null) return;

  const assignee = await prisma.employee.findUnique({ where: { employeeId: assignedToId } });
  if (!assignee) throw new EmployeeNotFoundError("The specified assignee does not exist");

  if (assignee.teamId !== teamId) {
    throw new InvalidTaskAssigneeError(
      "The assignee must already be a member of this team"
    );
  }

  if (!isTeamMemberRole(assignee.assignedRole)) {
    throw new InvalidTaskAssigneeError();
  }

  if (!assignee.isActive) {
    throw new InvalidTaskAssigneeError("Only active employees can be assigned tasks");
  }
};

const taskInclude = {
  assignedTo: {
    select: { employeeId: true, fullName: true, assignedRole: true },
  },
  createdBy: {
    select: { employeeId: true, fullName: true, assignedRole: true },
  },
} as const;

export const createTaskService = async (
  teamId: string,
  data: {
    title: string;
    description?: string;
    priority?: TaskPriority;
    status?: TaskStatus;
    dueDate?: Date;
    assignedToId?: bigint | null;
  },
  requester: Requester
) => {
  const team = await loadTeamOrThrow(teamId);
  assertCanManageTasks(team, requester);

  const assignedToId = data.assignedToId ?? null;
  await validateAssignee(teamId, assignedToId);

  return prisma.task.create({
    data: {
      teamId,
      title: data.title,
      description: data.description,
      priority: data.priority ?? TaskPriority.Medium,
      status: data.status ?? TaskStatus.Todo,
      dueDate: data.dueDate ? BigInt(data.dueDate.getTime()) : undefined,
      assignedToId: assignedToId ?? undefined,
      createdById: requester.employeeId,
      createdAt: BigInt(Date.now()),
      updatedAt: BigInt(Date.now()),
    },
    include: taskInclude,
  });
};

export const listTasksService = async (
  teamId: string,
  requester: Requester,
  filters: { status?: TaskStatus; assignedToId?: bigint }
) => {
  const team = await loadTeamOrThrow(teamId);
  await assertCanViewTasks(team, requester);

  return prisma.task.findMany({
    where: {
      teamId,
      status: filters.status,
      assignedToId: filters.assignedToId,
    },
    include: taskInclude,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
};

const loadTaskOrThrow = async (teamId: string, taskId: bigint) => {
  const task = await prisma.task.findUnique({ where: { taskId } });
  if (!task || task.teamId !== teamId) throw new TaskNotFoundError();
  return task;
};

export const updateTaskService = async (
  teamId: string,
  taskId: bigint,
  data: {
    title?: string;
    description?: string | null;
    priority?: TaskPriority;
    status?: TaskStatus;
    dueDate?: Date | null;
    assignedToId?: bigint | null;
  },
  requester: Requester
) => {
  const team = await loadTeamOrThrow(teamId);
  assertCanManageTasks(team, requester);

  const task = await loadTaskOrThrow(teamId, taskId);

  if (data.assignedToId !== undefined) {
    await validateAssignee(teamId, data.assignedToId);
  }

  const updateData: any = { updatedAt: BigInt(Date.now()) };
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.dueDate !== undefined) {
    updateData.dueDate = data.dueDate ? BigInt(data.dueDate.getTime()) : null;
  }
  if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId;

  if (data.status !== undefined) {
    updateData.status = data.status;
    updateData.completedAt =
      data.status === TaskStatus.Done
        ? BigInt(Date.now())
        : task.status === TaskStatus.Done
        ? null
        : task.completedAt;
  }

  return prisma.task.update({
    where: { taskId },
    data: updateData,
    include: taskInclude,
  });
};

/**
 * Self-service status update: the employee a task is assigned to may move
 * it through the workflow themselves, without needing manager access. They
 * may not touch anything else about the task (title, assignee, priority).
 */
export const updateOwnTaskStatusService = async (
  teamId: string,
  taskId: bigint,
  status: TaskStatus,
  requester: Requester
) => {
  const team = await loadTeamOrThrow(teamId);
  const task = await loadTaskOrThrow(teamId, taskId);

  const isOwner = task.assignedToId !== null && task.assignedToId === requester.employeeId;
  if (!isOwner) {
    // Fall back to manager/admin permissions so this endpoint still works
    // for them, matching the "manager can do anything on their team" rule.
    assertCanManageTasks(team, requester);
  }

  return prisma.task.update({
    where: { taskId },
    data: {
      status,
      updatedAt: BigInt(Date.now()),
      completedAt:
        status === TaskStatus.Done
          ? BigInt(Date.now())
          : task.status === TaskStatus.Done
          ? null
          : task.completedAt,
    },
    include: taskInclude,
  });
};

export const deleteTaskService = async (teamId: string, taskId: bigint, requester: Requester) => {
  const team = await loadTeamOrThrow(teamId);
  assertCanManageTasks(team, requester);

  await loadTaskOrThrow(teamId, taskId);

  await prisma.task.delete({ where: { taskId } });

  return { taskId };
};
