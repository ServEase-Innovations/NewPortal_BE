import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";

import {
  createTeamService,
  deleteTeamService,
  getTeamByIdService,
  getTeamsService,
  updateTeamService,
  addTeamMemberService,
  removeTeamMemberService,
  getTeamProgressService,
  TeamNotFoundError,
  TeamAccessError,
  InvalidTeamMemberRoleError,
  EmployeeNotFoundError,
  DuplicateTeamNameError,
  Requester,
} from "../services/team.service";

import {
  createTeamSchema,
  updateTeamSchema,
  addTeamMemberSchema,
} from "../validations/team.validation";

// Every BigInt field on the model/relations that needs to cross the wire as
// a plain JSON value.
const serializeTeam = (team: any) => {
  if (!team) return null;

  return {
    ...team,
    managerId: team.managerId !== undefined ? team.managerId.toString() : undefined,
    manager: team.manager
      ? { ...team.manager, employeeId: team.manager.employeeId.toString() }
      : undefined,
    milestoneDeadline: team.milestoneDeadline
      ? new Date(Number(team.milestoneDeadline)).toISOString()
      : null,
    createdAt: team.createdAt ? new Date(Number(team.createdAt)).toISOString() : null,
    updatedAt: team.updatedAt ? new Date(Number(team.updatedAt)).toISOString() : null,
    taskCount: team._count ? team._count.tasks : undefined,
    _count: undefined,
    employees: team.employees
      ? team.employees.map((emp: any) => ({
          ...emp,
          employeeId: emp.employeeId.toString(),
          managerId: emp.managerId ? emp.managerId.toString() : null,
          joinedAt: emp.joinedAt ? new Date(Number(emp.joinedAt)).toISOString() : null,
          last_login: emp.last_login ? new Date(Number(emp.last_login)).toISOString() : null,
          password: undefined,
          refresh_token: undefined,
        }))
      : undefined,
  };
};

const serializeTeams = (teams: any[]) => teams.map(serializeTeam);

const getRequester = (req: AuthRequest): Requester => ({
  employeeId: BigInt(req.employee!.employeeId),
  assignedRole: req.employee!.assignedRole,
});

const handleServiceError = (res: Response, error: unknown) => {
  if (error instanceof TeamNotFoundError) {
    return res.status(404).json({ message: error.message });
  }
  if (error instanceof TeamAccessError) {
    return res.status(403).json({ message: error.message });
  }
  if (error instanceof InvalidTeamMemberRoleError) {
    return res.status(400).json({ message: error.message });
  }
  if (error instanceof EmployeeNotFoundError) {
    return res.status(404).json({ message: error.message });
  }
  if (error instanceof DuplicateTeamNameError) {
    return res.status(409).json({ message: error.message });
  }
  console.error("❌ Team error:", error);
  return res.status(500).json({ message: "Something went wrong" });
};

export const createTeam = async (req: AuthRequest, res: Response) => {
  try {
    const result = createTeamSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.flatten(),
      });
    }

    const team = await createTeamService(result.data, getRequester(req));

    res.status(201).json(serializeTeam(team));
  } catch (error) {
    handleServiceError(res, error);
  }
};

export const getTeams = async (req: AuthRequest, res: Response) => {
  try {
    const teams = await getTeamsService(getRequester(req));
    res.json(serializeTeams(teams));
  } catch (error) {
    handleServiceError(res, error);
  }
};

export const getTeamById = async (req: AuthRequest<{ id: string }>, res: Response) => {
  try {
    const team = await getTeamByIdService(req.params.id, getRequester(req));
    res.json(serializeTeam(team));
  } catch (error) {
    handleServiceError(res, error);
  }
};

export const updateTeam = async (req: AuthRequest<{ id: string }>, res: Response) => {
  try {
    const result = updateTeamSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.flatten(),
      });
    }

    const team = await updateTeamService(req.params.id, result.data, getRequester(req));
    res.json(serializeTeam(team));
  } catch (error) {
    handleServiceError(res, error);
  }
};

export const deleteTeam = async (req: AuthRequest<{ id: string }>, res: Response) => {
  try {
    await deleteTeamService(req.params.id, getRequester(req));
    res.json({ message: "Team deleted successfully" });
  } catch (error) {
    handleServiceError(res, error);
  }
};

// ----------------------------------------------------------------------------
// Membership
// ----------------------------------------------------------------------------

export const addTeamMember = async (req: AuthRequest<{ id: string }>, res: Response) => {
  try {
    const result = addTeamMemberSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.flatten(),
      });
    }

    const employee = await addTeamMemberService(
      req.params.id,
      result.data.employeeId,
      getRequester(req)
    );

    res.status(200).json({
      message: "Employee added to team",
      employeeId: employee.employeeId.toString(),
      teamId: employee.teamId,
    });
  } catch (error) {
    handleServiceError(res, error);
  }
};

export const removeTeamMember = async (
  req: AuthRequest<{ id: string; employeeId: string }>,
  res: Response
) => {
  try {
    if (!/^\d+$/.test(req.params.employeeId)) {
      return res.status(400).json({ message: "Invalid employeeId" });
    }

    await removeTeamMemberService(
      req.params.id,
      BigInt(req.params.employeeId),
      getRequester(req)
    );

    res.json({ message: "Employee removed from team" });
  } catch (error) {
    handleServiceError(res, error);
  }
};

// ----------------------------------------------------------------------------
// Progress tracking
// ----------------------------------------------------------------------------

export const getTeamProgress = async (req: AuthRequest<{ id: string }>, res: Response) => {
  try {
    const progress = await getTeamProgressService(req.params.id, getRequester(req));
    res.json(progress);
  } catch (error) {
    handleServiceError(res, error);
  }
};
