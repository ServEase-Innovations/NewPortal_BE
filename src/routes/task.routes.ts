import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import {
  createTask,
  getTasks,
  updateTask,
  updateTaskStatus,
  deleteTask,
} from "../controllers/task.controller";

// mergeParams so :teamId from the parent /teams/:teamId router is available here.
const router = Router({ mergeParams: true });

router.use(authenticate);

/**
 * @swagger
 * /teams/{teamId}/tasks:
 *   post:
 *     summary: Create a task within a team
 *     description: >
 *       Creates a task for the given team. Only the manager who owns the
 *       team (or SuperAdmin/HR) may create tasks. If assignedToId is
 *       provided, the assignee must already be a member of this team and
 *       hold the Developer, Marketing, or CustomStaff role.
 *     tags:
 *       - Tasks
 *     parameters:
 *       - in: path
 *         name: teamId
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
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 example: Implement login screen
 *               description:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [Low, Medium, High, Urgent]
 *               status:
 *                 type: string
 *                 enum: [Todo, InProgress, InReview, Done, Blocked]
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               assignedToId:
 *                 type: string
 *                 nullable: true
 *                 example: "12"
 *     responses:
 *       201:
 *         description: Task created successfully
 *       400:
 *         description: Validation failed, or the assignee is not eligible
 *       403:
 *         description: Not the owning manager (or SuperAdmin/HR)
 *       404:
 *         description: Team not found
 */
router.post("/", authorize("SuperAdmin", "HR", "Manager"), createTask);

/**
 * @swagger
 * /teams/{teamId}/tasks:
 *   get:
 *     summary: List tasks for a team
 *     description: >
 *       Visible to platform admins, the owning manager, and members of the
 *       team. Supports optional status/assignedToId filters.
 *     tags:
 *       - Tasks
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Todo, InProgress, InReview, Done, Blocked]
 *       - in: query
 *         name: assignedToId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tasks fetched successfully
 */
router.get("/", getTasks);

/**
 * @swagger
 * /teams/{teamId}/tasks/{taskId}:
 *   patch:
 *     summary: Update a task (manager/admin)
 *     description: >
 *       Full update of a task's title, description, priority, status, due
 *       date, or assignee. Restricted to the owning manager or SuperAdmin/HR.
 *     tags:
 *       - Tasks
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task updated successfully
 *       403:
 *         description: Not the owning manager (or SuperAdmin/HR)
 *       404:
 *         description: Task not found
 */
router.patch("/:taskId", authorize("SuperAdmin", "HR", "Manager"), updateTask);

/**
 * @swagger
 * /teams/{teamId}/tasks/{taskId}/status:
 *   patch:
 *     summary: Update a task's status (self-service)
 *     description: >
 *       The employee a task is assigned to can move it through the workflow
 *       themselves (e.g. Todo -> InProgress -> Done). The owning manager or
 *       SuperAdmin/HR may also use this endpoint.
 *     tags:
 *       - Tasks
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: taskId
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Todo, InProgress, InReview, Done, Blocked]
 *     responses:
 *       200:
 *         description: Task status updated
 *       403:
 *         description: Not the assignee, owning manager, or SuperAdmin/HR
 */
router.patch("/:taskId/status", updateTaskStatus);

/**
 * @swagger
 * /teams/{teamId}/tasks/{taskId}:
 *   delete:
 *     summary: Delete a task
 *     description: Restricted to the owning manager or SuperAdmin/HR.
 *     tags:
 *       - Tasks
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task deleted successfully
 */
router.delete("/:taskId", authorize("SuperAdmin", "HR", "Manager"), deleteTask);

export default router;
