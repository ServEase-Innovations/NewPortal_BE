import { Router } from "express";
import {
  createDailyTask,
  deleteDailyTaskAttachment,
  getDailyTaskById,
  getDailyTaskHistory,
  getDailyTasks,
  getMyDailyTasks,
  updateDailyTask,
  uploadDailyTaskAttachments,
} from "../controllers/daily-task.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { handleDailyTaskUpload } from "../middleware/daily-task-upload.middleware";

const router = Router();

/**
 * @swagger
 * /daily-tasks:
 *   post:
 *     summary: Submit today's daily work report
 *     description: An employee can submit more than one report per day — there is no longer a one-report-per-day restriction.
 *     tags: [Daily Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [workDescription]
 *             properties:
 *               workDescription:
 *                 type: string
 *                 example: Completed login validation and fixed the employee filter.
 *               status:
 *                 type: string
 *                 enum: [Pending, Completed]
 *                 default: Pending
 *               newIdeas:
 *                 type: string
 *                 example: Add automated regression tests for authentication.
 *               jiraLinks:
 *                 type: array
 *                 maxItems: 25
 *                 items:
 *                   type: object
 *                   required: [url]
 *                   properties:
 *                     label:
 *                       type: string
 *                       example: PORTAL-142
 *                     url:
 *                       type: string
 *                       example: https://company.atlassian.net/browse/PORTAL-142
 *     responses:
 *       201:
 *         description: Daily task submitted successfully. The employeeId is not accepted as input; it is derived server-side from the authenticated user's token and returned in the response so it's always clear who submitted the report.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Daily task submitted successfully
 *                 dailyTask:
 *                   type: object
 *                   properties:
 *                     dailyTaskSubmissionId:
 *                       type: string
 *                     employeeId:
 *                       type: string
 *                       description: ID of the employee who submitted the report (taken from the authenticated session, not client-supplied)
 *                     workDescription:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [Pending, Completed]
 *                     newIdeas:
 *                       type: string
 *                       nullable: true
 *                     submissionDate:
 *                       type: string
 *                       format: date
 *                     submittedAt:
 *                       type: string
 *                       format: date-time
 *                     jiraLinks:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           label:
 *                             type: string
 *                           url:
 *                             type: string
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Authentication required
 */
router.post("/", authenticate, createDailyTask);

/**
 * @swagger
 * /daily-tasks:
 *   get:
 *     summary: Review employee submissions for a selected date
 *     description: Available to SuperAdmin, HR, and Manager roles. Date defaults to today in APP_TIME_ZONE.
 *     tags: [Daily Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         example: 2026-07-10
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Completed]
 *     responses:
 *       200:
 *         description: Daily tasks fetched successfully
 *       403:
 *         description: Reviewer role required
 */
router.get(
  "/",
  authenticate,
  authorize("SuperAdmin", "HR", "Manager"),
  getDailyTasks
);

/**
 * @swagger
 * /daily-tasks/mine:
 *   get:
 *     summary: Get the authenticated employee's submission for a date
 *     tags: [Daily Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Completed]
 *     responses:
 *       200:
 *         description: Employee daily tasks fetched successfully
 */
router.get("/mine", authenticate, getMyDailyTasks);

/**
 * @swagger
 * /daily-tasks/history:
 *   get:
 *     summary: View an employee's daily task submission history for a year (paginated)
 *     description: >
 *       Available to any authenticated employee (SuperAdmin, Manager, Developer,
 *       Marketing, CustomStaff, HR). The caller supplies an employeeId and a year;
 *       the system returns that employee's daily task submissions for the whole
 *       year, newest first, 10 records per page by default. Use the `page` query
 *       parameter to move through the history (page=1 for the first 10, page=2
 *       for the next 10, and so on).
 *     tags: [Daily Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *         example: "12"
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *         example: 2026
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Completed]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Records per page (max 100). Defaults to 10.
 *         example: 10
 *     responses:
 *       200:
 *         description: Daily task history fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 employeeId:
 *                   type: string
 *                 year:
 *                   type: integer
 *                 dailyTasks:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalCount:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     hasNextPage:
 *                       type: boolean
 *                     hasPreviousPage:
 *                       type: boolean
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Authentication required
 */
router.get(
  "/history",
  authenticate,
  authorize(
    "SuperAdmin",
    "Manager",
    "Developer",
    "Marketing",
    "CustomStaff",
    "HR"
  ),
  getDailyTaskHistory
);

/**
 * @swagger
 * /daily-tasks/{id}:
 *   get:
 *     summary: Get one daily task with Jira links and attachments
 *     tags: [Daily Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Daily task fetched successfully
 *       403:
 *         description: Owner or reviewer access required
 *       404:
 *         description: Daily task not found
 */
router.get("/:id", authenticate, getDailyTaskById);

/**
 * @swagger
 * /daily-tasks/{id}:
 *   patch:
 *     summary: Update the authenticated employee's daily task
 *     tags: [Daily Tasks]
 *     security:
 *       - bearerAuth: []
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
 *             properties:
 *               workDescription:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [Pending, Completed]
 *               newIdeas:
 *                 type: string
 *                 nullable: true
 *               jiraLinks:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [url]
 *                   properties:
 *                     label:
 *                       type: string
 *                     url:
 *                       type: string
 *                       format: uri
 *     responses:
 *       200:
 *         description: Daily task updated successfully
 *       403:
 *         description: Only the submitting employee can update the task
 */
router.patch("/:id", authenticate, updateDailyTask);

/**
 * @swagger
 * /daily-tasks/{id}/attachments:
 *   post:
 *     summary: Upload one or more files for a daily task
 *     tags: [Daily Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [files]
 *             properties:
 *               files:
 *                 type: array
 *                 maxItems: 10
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Attachments uploaded and recorded successfully
 *       400:
 *         description: Invalid file or upload limit exceeded
 *       403:
 *         description: Only the submitting employee can upload attachments
 */
router.post(
  "/:id/attachments",
  authenticate,
  handleDailyTaskUpload,
  uploadDailyTaskAttachments
);

/**
 * @swagger
 * /daily-tasks/{id}/attachments/{attachmentId}:
 *   delete:
 *     summary: Delete one attachment from a daily task
 *     tags: [Daily Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: attachmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Attachment deleted successfully
 *       403:
 *         description: Only the uploading employee can delete it
 *       404:
 *         description: Attachment not found
 */
router.delete(
  "/:id/attachments/:attachmentId",
  authenticate,
  deleteDailyTaskAttachment
);

export default router;