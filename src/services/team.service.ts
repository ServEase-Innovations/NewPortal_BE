import prisma from "../prisma";
import { EmployeeRole, Prisma } from "@prisma/client";
import { TEAM_MEMBER_ROLES, isTeamMemberRole } from "../constants/team-roles";

// ============================================================================
// Errors
// ============================================================================

export class TeamNotFoundError extends Error {
  constructor(message = "Team not found") {
    super(message);
    this.name = "TeamNotFoundError";
  }
}

export class TeamAccessError extends Error {
  constructor(message = "You do not have access to this team") {
    super(message);
    this.name = "TeamAccessError";
  }
}

export class InvalidTeamMemberRoleError extends Error {
  constructor(
    message = `Only employees with role ${TEAM_MEMBER_ROLES.join(
      ", "
    )} can be assigned to a team`
  ) {
    super(message);
    this.name = "InvalidTeamMemberRoleError";
  }
}

export class EmployeeNotFoundError extends Error {
  constructor(message = "Employee not found") {
    super(message);
    this.name = "EmployeeNotFoundError";
  }
}

export class DuplicateTeamNameError extends Error {
  constructor(message = "A team with this name already exists") {
    super(message);
    this.name = "DuplicateTeamNameError";
  }
}

/**
 * Thrown for well-understood "the caller sent something we can't act on"
 * cases that aren't already covered by a more specific error class (e.g. a
 * date that fails to coerce to a real timestamp). Kept distinct from Zod's
 * own validation errors so it can be raised from deep inside the service
 * layer, not just at the request boundary.
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Safely turns a Date into the epoch-millis BigInt the schema stores.
 * `Date` objects built from a bad coercion (e.g. an empty string, or a
 * malformed value that slipped past Zod) can be an "Invalid Date", whose
 * `.getTime()` is NaN - and `BigInt(NaN)` throws a raw, uncaught
 * `RangeError` that previously fell straight through to the generic 500
 * handler. This turns that into a clean, actionable 400 instead.
 */
export const toEpochMillis = (date: Date, fieldName: string): bigint => {
  const millis = date.getTime();
  if (!Number.isFinite(millis)) {
    throw new ValidationError(`${fieldName} must be a valid date`);
  }
  return BigInt(millis);
};

/**
 * Maps the Prisma error codes that can realistically surface from the
 * operations in this file to the domain errors above, so a race condition
 * (e.g. two requests creating the same team name at once) or a stale
 * foreign key produces a clean 4xx instead of an unhandled 500. Anything
 * unrecognized is re-thrown as-is for the generic handler to log.
 */
export const mapPrismaError = (error: unknown): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      throw new DuplicateTeamNameError();
    }
    if (error.code === "P2003") {
      throw new EmployeeNotFoundError(
        "One of the referenced employees no longer exists"
      );
    }
    if (error.code === "P2025") {
      throw new TeamNotFoundError();
    }
  }
  throw error;
};

// ============================================================================
// Requester / access control helpers
// ============================================================================

export interface Requester {
  employeeId: bigint;
  assignedRole: EmployeeRole;
}

const isPlatformAdmin = (requester: Requester) =>
  requester.assignedRole === EmployeeRole.SuperAdmin ||
  requester.assignedRole === EmployeeRole.HR;

/**
 * Managers can only administer teams they personally own. SuperAdmin/HR can
 * administer any team. Anyone else (Developer/Marketing/CustomStaff) can
 * never administer a team, even one they happen to be a member of.
 */
const assertCanAdministerTeam = (
  team: { managerId: bigint },
  requester: Requester
) => {
  if (isPlatformAdmin(requester)) return;

  if (
    requester.assignedRole === EmployeeRole.Manager &&
    team.managerId === requester.employeeId
  ) {
    return;
  }

  throw new TeamAccessError(
    "Only the manager who owns this team (or a SuperAdmin/HR) may perform this action"
  );
};

/**
 * Read access is a little wider than admin access: a team member may view
 * their own team, in addition to the owning manager and platform admins.
 */
const assertCanViewTeam = async (
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

// ============================================================================
// CRUD
// ============================================================================

const teamInclude = {
  employees: true,
  manager: {
    select: {
      employeeId: true,
      fullName: true,
      emailAddress: true,
      assignedRole: true,
    },
  },
  _count: { select: { tasks: true } },
} as const;

export const createTeamService = async (
  data: {
    teamName: string;
    projectTitle: string;
    projectSummary?: string;
    milestoneDeadline: Date;
    managerId?: bigint;
  },
  requester: Requester
) => {
  // A manager creating a team always owns it themselves. Only a platform
  // admin may create a team on behalf of a different manager.
  let managerId = data.managerId ?? requester.employeeId;

  if (data.managerId && data.managerId !== requester.employeeId) {
    if (!isPlatformAdmin(requester)) {
      throw new TeamAccessError(
        "Only SuperAdmin/HR may create a team on behalf of another manager"
      );
    }
    managerId = data.managerId;
  }

  const manager = await prisma.employee.findUnique({
    where: { employeeId: managerId },
  });

  if (!manager) {
    throw new EmployeeNotFoundError("The specified manager does not exist");
  }

  if (
    manager.assignedRole !== EmployeeRole.Manager &&
    manager.assignedRole !== EmployeeRole.SuperAdmin
  ) {
    throw new TeamAccessError(
      "A team must be owned by an employee with role Manager or SuperAdmin"
    );
  }

  const existing = await prisma.team.findUnique({
    where: { teamName: data.teamName },
  });
  if (existing) {
    throw new DuplicateTeamNameError();
  }

  const milestoneDeadline = toEpochMillis(data.milestoneDeadline, "milestoneDeadline");

  try {
    const team = await prisma.team.create({
      data: {
        teamName: data.teamName,
        projectTitle: data.projectTitle,
        projectSummary: data.projectSummary,
        milestoneDeadline,
        managerId,
        createdAt: BigInt(Date.now()),
        updatedAt: BigInt(Date.now()),
      },
      include: teamInclude,
    });

    return team;
  } catch (error) {
    // Covers the race where two requests pass the findUnique check above
    // for the same teamName before either has committed its insert.
    return mapPrismaError(error);
  }
};

/**
 * Teams visible to the requester:
 *  - SuperAdmin / HR: every team (full oversight of the organization).
 *  - Manager: only the teams they personally own.
 *  - Developer / Marketing / CustomStaff: only their own team, if any.
 */
export const getTeamsService = async (requester: Requester) => {
  if (isPlatformAdmin(requester)) {
    return prisma.team.findMany({ include: teamInclude, orderBy: { createdAt: "desc" } });
  }

  if (requester.assignedRole === EmployeeRole.Manager) {
    return prisma.team.findMany({
      where: { managerId: requester.employeeId },
      include: teamInclude,
      orderBy: { createdAt: "desc" },
    });
  }

  return prisma.team.findMany({
    where: { employees: { some: { employeeId: requester.employeeId } } },
    include: teamInclude,
    orderBy: { createdAt: "desc" },
  });
};

export const getTeamByIdService = async (id: string, requester: Requester) => {
  const team = await prisma.team.findUnique({
    where: { teamId: id },
    include: teamInclude,
  });

  if (!team) throw new TeamNotFoundError();

  await assertCanViewTeam(team, requester);

  return team;
};

export const updateTeamService = async (
  id: string,
  data: {
    teamName?: string;
    projectTitle?: string;
    projectSummary?: string | null;
    milestoneDeadline?: Date;
    managerId?: bigint;
  },
  requester: Requester
) => {
  const team = await prisma.team.findUnique({ where: { teamId: id } });
  if (!team) throw new TeamNotFoundError();

  assertCanAdministerTeam(team, requester);

  // Reassigning the owning manager is a sensitive operation restricted to
  // platform admins, even for the manager who currently owns the team.
  if (data.managerId && data.managerId !== team.managerId) {
    if (!isPlatformAdmin(requester)) {
      throw new TeamAccessError(
        "Only SuperAdmin/HR may reassign a team to a different manager"
      );
    }

    const newManager = await prisma.employee.findUnique({
      where: { employeeId: data.managerId },
    });
    if (!newManager) throw new EmployeeNotFoundError("The specified manager does not exist");
    if (
      newManager.assignedRole !== EmployeeRole.Manager &&
      newManager.assignedRole !== EmployeeRole.SuperAdmin
    ) {
      throw new TeamAccessError(
        "A team must be owned by an employee with role Manager or SuperAdmin"
      );
    }
  }

  if (data.teamName && data.teamName !== team.teamName) {
    const existing = await prisma.team.findUnique({ where: { teamName: data.teamName } });
    if (existing) throw new DuplicateTeamNameError();
  }

  const updateData: any = { updatedAt: BigInt(Date.now()) };
  if (data.teamName !== undefined) updateData.teamName = data.teamName;
  if (data.projectTitle !== undefined) updateData.projectTitle = data.projectTitle;
  if (data.projectSummary !== undefined) updateData.projectSummary = data.projectSummary;
  if (data.milestoneDeadline !== undefined) {
    updateData.milestoneDeadline = toEpochMillis(data.milestoneDeadline, "milestoneDeadline");
  }
  if (data.managerId !== undefined) updateData.managerId = data.managerId;

  try {
    return await prisma.team.update({
      where: { teamId: id },
      data: updateData,
      include: teamInclude,
    });
  } catch (error) {
    return mapPrismaError(error);
  }
};

export const deleteTeamService = async (id: string, requester: Requester) => {
  const team = await prisma.team.findUnique({ where: { teamId: id } });
  if (!team) throw new TeamNotFoundError();

  assertCanAdministerTeam(team, requester);

  // Unassign members rather than relying on a DB cascade, so employees are
  // never silently left pointing at a deleted team.
  await prisma.$transaction([
    prisma.employee.updateMany({
      where: { teamId: id },
      data: { teamId: null },
    }),
    prisma.team.delete({ where: { teamId: id } }),
  ]);

  return { teamId: id };
};

// ============================================================================
// Membership management (role-restricted)
// ============================================================================

export const addTeamMemberService = async (
  teamId: string,
  employeeId: bigint,
  requester: Requester
) => {
  const team = await prisma.team.findUnique({ where: { teamId } });
  if (!team) throw new TeamNotFoundError();

  assertCanAdministerTeam(team, requester);

  const employee = await prisma.employee.findUnique({ where: { employeeId } });
  if (!employee) throw new EmployeeNotFoundError();

  // Hard restriction: only Developer, Marketing, and Customer Staff may ever
  // be added as team members. This is re-checked here even though the
  // validation layer also filters it, so the rule holds no matter how the
  // service is invoked.
  if (!isTeamMemberRole(employee.assignedRole)) {
    throw new InvalidTeamMemberRoleError();
  }

  if (!employee.isActive) {
    throw new InvalidTeamMemberRoleError("Only active employees can be assigned to a team");
  }

  const updated = await prisma.employee.update({
    where: { employeeId },
    data: { teamId },
  });

  return updated;
};

export const removeTeamMemberService = async (
  teamId: string,
  employeeId: bigint,
  requester: Requester
) => {
  const team = await prisma.team.findUnique({ where: { teamId } });
  if (!team) throw new TeamNotFoundError();

  assertCanAdministerTeam(team, requester);

  const employee = await prisma.employee.findUnique({ where: { employeeId } });
  if (!employee || employee.teamId !== teamId) {
    throw new EmployeeNotFoundError("This employee is not a member of this team");
  }

  // Unassign any tasks still assigned to them within this team so completed
  // work stays intact but nothing is left pointing at a departed member.
  await prisma.$transaction([
    prisma.task.updateMany({
      where: { teamId, assignedToId: employeeId },
      data: { assignedToId: null },
    }),
    prisma.employee.update({
      where: { employeeId },
      data: { teamId: null },
    }),
  ]);

  return { teamId, employeeId };
};

// ============================================================================
// Progress tracking
// ============================================================================

export const getTeamProgressService = async (teamId: string, requester: Requester) => {
  const team = await prisma.team.findUnique({ where: { teamId } });
  if (!team) throw new TeamNotFoundError();

  await assertCanViewTeam(team, requester);

  const grouped = await prisma.task.groupBy({
    by: ["status"],
    where: { teamId },
    _count: { _all: true },
  });

  const countsByStatus: Record<string, number> = {
    Todo: 0,
    InProgress: 0,
    InReview: 0,
    Done: 0,
    Blocked: 0,
  };
  for (const row of grouped) {
    countsByStatus[row.status] = row._count._all;
  }

  const totalTasks = Object.values(countsByStatus).reduce((a, b) => a + b, 0);
  const doneTasks = countsByStatus.Done;
  const percentComplete = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 1000) / 10;

  const overdueTasks = await prisma.task.count({
    where: {
      teamId,
      status: { not: "Done" },
      dueDate: { lt: BigInt(Date.now()) },
    },
  });

  return {
    teamId,
    totalTasks,
    countsByStatus,
    percentComplete,
    overdueTasks,
  };
};
