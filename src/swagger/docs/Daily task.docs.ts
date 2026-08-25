/**
 * Swagger path documentation for the Daily Tasks module.
 *
 * This file holds no executable code — it only exists so that
 * `swagger-jsdoc` (see ../swagger.ts) can pick up `@swagger` blocks from a
 * single, dedicated location instead of having them inlined inside the
 * route definitions in `src/routes/daily-task.routes.ts`. Keeping API docs
 * out of the routes file keeps that file focused on wiring middleware to
 * controllers, and keeps all Swagger docs discoverable in one place.
 *
 * Make sure `src/swagger/swagger.ts`'s `apis` glob includes this file
 * (e.g. `./src/swagger/docs/*.ts`) or these blocks will silently stop
 * showing up in the generated spec.
 */

/**
 * @swagger
 * /daily-tasks/history:
 *   get:
 *     summary: View an employee's daily task submission history for a year (paginated)
 *     description: >
 *       The caller supplies an employeeId and a year. SuperAdmin, Manager, and HR
 *       may look up any employee's history. All other authenticated roles
 *       (Developer, Marketing, CustomStaff) may only request their own
 *       employeeId — requesting another employee's history returns 403.
 *       Results are returned newest first, 10 records per page by default.
 *       Use the `page` query parameter to move through the history (page=1
 *       for the first 10, page=2 for the next 10, and so on).
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
 *       403:
 *         description: Caller is not a reviewer and requested another employee's history
 */
export {};