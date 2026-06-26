import { Request, Response } from "express";

import {
  createTeamService,
  deleteTeamService,
  getTeamByIdService,
  getTeamsService,
  updateTeamService,
} from "../services/team.service";

import { createTeamSchema } from "../validations/team.validation";

export const createTeam = async (
  req: Request,
  res: Response
) => {
  try {
    const result = createTeamSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.flatten(),
      });
    }

    const team = await createTeamService(result.data);

    res.status(201).json(team);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Something went wrong",
    });
  }
};

export const getTeams = async (
  req: Request,
  res: Response
) => {
  try {
    const teams = await getTeamsService();

    res.json(teams);

  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch teams",
    });
  }
};

export const getTeamById = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const team = await getTeamByIdService(
      req.params.id
    );

    if (!team) {
      return res.status(404).json({
        message: "Team not found",
      });
    }

    res.json(team);

  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch team",
    });
  }
};

export const updateTeam = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const team = await updateTeamService(
      req.params.id,
      req.body
    );

    res.json(team);

  } catch (error) {
    res.status(500).json({
      message: "Failed to update team",
    });
  }
};

export const deleteTeam = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    await deleteTeamService(req.params.id);

    res.json({
      message: "Team deleted successfully",
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to delete team",
    });
  }
};