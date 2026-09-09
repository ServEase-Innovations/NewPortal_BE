import { Router } from "express";

import {
  createTeam,
  getTeams,
  getTeamById,
  updateTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
  getTeamProgress,
} from "../controllers/team.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import taskRoutes from "./task.routes";

const router = Router();

// Every team route requires authentication; fine-grained role/ownership
// checks happen per-route (and again in the service layer) below.
router.use(authenticate);

/**
 * @swagger
 * /teams:
 *   post:
 *     summary: Create a new team
 *     description: >
 *       Creates a new team owned by the authenticated manager. SuperAdmin/HR
 *       may create a team on behalf of a different manager by passing
 *       managerId explicitly.
 *     tags:
 *       - Teams
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - teamName
 *               - projectTitle
 *               - milestoneDeadline
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
 *               managerId:
 *                 type: string
 *                 description: SuperAdmin/HR only - owning manager's employeeId
 *     responses:
 *       201:
 *         description: Team created successfully
 *       403:
 *         description: Only a Manager, SuperAdmin, or HR may create a team
 *       409:
 *         description: A team with this name already exists
 */
router.post("/", authorize("SuperAdmin", "HR", "Manager"), createTeam);

/**
 * @swagger
 * /teams:
 *   get:
 *     summary: Get teams visible to the authenticated employee
 *     description: >
 *       SuperAdmin/HR see every team. A Manager sees only the teams they
 *       own. A Developer/Marketing/CustomStaff employee sees only their own
 *       team, if any.
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
 *     description: >
 *       Returns a single team, including its members and open task count.
 *       Accessible to platform admins, the owning manager, or a member of
 *       the team.
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
 *       403:
 *         description: Not authorized to view this team
 *       404:
 *         description: Team not found
 */
router.get("/:id", getTeamById);

/**
 * @swagger
 * /teams/{id}:
 *   put:
 *     summary: Update a team
 *     description: >
 *       Updates an existing team's details. Restricted to the owning
 *       manager or SuperAdmin/HR. Reassigning managerId to a different
 *       manager is restricted to SuperAdmin/HR.
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
 *                 example: 2027-01-31T00:00:00.000Z
 *               managerId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Team updated successfully
 *       403:
 *         description: Not authorized to update this team
 *       404:
 *         description: Team not found
 */
router.put("/:id", authorize("SuperAdmin", "HR", "Manager"), updateTeam);

/**
 * @swagger
 * /teams/{id}:
 *   delete:
 *     summary: Delete a team
 *     description: >
 *       Deletes a team and unassigns its members. Restricted to the owning
 *       manager or SuperAdmin/HR.
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
router.delete("/:id", authorize("SuperAdmin", "HR", "Manager"), deleteTeam);

/**
 * @swagger
 * /teams/{id}/members:
 *   post:
 *     summary: Add a member to a team
 *     description: >
 *       Assigns an employee to the team. Restricted to the owning manager
 *       or SuperAdmin/HR. The employee's role must be Developer, Marketing,
 *       or CustomStaff - no other role can ever be added as a team member.
 *     tags:
 *       - Teams
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeId
 *             properties:
 *               employeeId:
 *                 type: string
 *                 example: "42"
 *     responses:
 *       200:
 *         description: Employee added to team
 *       400:
 *         description: The employee's role is not eligible for team membership
 *       403:
 *         description: Not authorized to manage this team
 *       404:
 *         description: Team or employee not found
 */
router.post("/:id/members", authorize("SuperAdmin", "HR", "Manager"), addTeamMember);

/**
 * @swagger
 * /teams/{id}/members/{employeeId}:
 *   delete:
 *     summary: Remove a member from a team
 *     description: >
 *       Unassigns an employee from the team and clears any tasks assigned
 *       to them within it. Restricted to the owning manager or SuperAdmin/HR.
 *     tags:
 *       - Teams
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Employee removed from team
 *       404:
 *         description: Team not found, or employee is not a member of this team
 */
router.delete(
  "/:id/members/:employeeId",
  authorize("SuperAdmin", "HR", "Manager"),
  removeTeamMember
);

/**
 * @swagger
 * /teams/{id}/progress:
 *   get:
 *     summary: Get project progress for a team
 *     description: >
 *       Returns task counts by status, percent complete, and overdue task
 *       count for the team. Accessible to platform admins, the owning
 *       manager, or a member of the team.
 *     tags:
 *       - Teams
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Progress summary
 *       404:
 *         description: Team not found
 */
router.get("/:id/progress", getTeamProgress);

// Nested task management: /teams/:teamId/tasks
router.use("/:teamId/tasks", taskRoutes);

export default router;
