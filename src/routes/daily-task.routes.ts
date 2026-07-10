import { Router } from "express";
import {
  createDailyTask,
  deleteDailyTaskAttachment,
  getDailyTaskById,
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
 *                       format: uri
 *                       example: https://company.atlassian.net/browse/PORTAL-142
 *     responses:
 *       201:
 *         description: Daily task submitted successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Authentication required
 *       409:
 *         description: The employee already submitted a report today
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
