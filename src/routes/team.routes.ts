import { Router } from "express";

import {
  createTeam,
  getTeams,
  getTeamById,
  updateTeam,
  deleteTeam,
} from "../controllers/team.controller";

const router = Router();

/**
 * @swagger
 * /teams:
 *   post:
 *     summary: Create a new team
 *     description: Creates a new team in the database.
 *     tags:
 *       - Teams
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               teamName:
 *                 type: string
 *                 example: Alpha Team
 *               projectTitle:
 *                 type: string
 *                 example: Employee Management System
 *               projectSummary:
 *                 type: string
 *                 example: Backend development using Prisma
 *               milestoneDeadline:
 *                 type: string
 *                 format: date-time
 *                 description: Project milestone deadline (stored as epoch, sent/received as ISO 8601)
 *                 example: 2026-12-31T00:00:00.000Z
 *     responses:
 *       201:
 *         description: Team created successfully
 */
router.post("/", createTeam);

/**
 * @swagger
 * /teams:
 *   get:
 *     summary: Get all teams
 *     description: Returns a list of all teams.
 *     tags:
 *       - Teams
 *     responses:
 *       200:
 *         description: Teams fetched successfully.
 */
router.get("/", getTeams);

/**
 * @swagger
 * /teams/{id}:
 *   get:
 *     summary: Get team by ID
 *     description: Returns a single team using the team ID.
 *     tags:
 *       - Teams
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Team ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Team found successfully
 *       404:
 *         description: Team not found
 */
router.get("/:id", getTeamById);

/**
 * @swagger
 * /teams/{id}:
 *   put:
 *     summary: Update a team
 *     description: Updates an existing team.
 *     tags:
 *       - Teams
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Team ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               teamName:
 *                 type: string
 *                 example: Alpha Team Updated
 *               projectTitle:
 *                 type: string
 *                 example: HRMS Project
 *               projectSummary:
 *                 type: string
 *                 example: Updated project summary
 *               milestoneDeadline:
 *                 type: string
 *                 format: date-time
 *                 description: Project milestone deadline (stored as epoch, sent/received as ISO 8601)
 *                 example: 2027-01-31T00:00:00.000Z
 *     responses:
 *       200:
 *         description: Team updated successfully
 *       404:
 *         description: Team not found
 */
router.put("/:id", updateTeam);

/**
 * @swagger
 * /teams/{id}:
 *   delete:
 *     summary: Delete a team
 *     description: Deletes a team from the database.
 *     tags:
 *       - Teams
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Team ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Team deleted successfully
 *       404:
 *         description: Team not found
 */
router.delete("/:id", deleteTeam);

export default router;