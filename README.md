# NewPortal_BE

Employee management backend built with Express, TypeScript, Prisma, and
PostgreSQL. The existing Employee, Team, and Attendance APIs remain available,
with an additive Daily Task Submission feature.

## Setup

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Copy `.env.example` to `.env` and supply your own database and JWT values.
`APP_TIME_ZONE` controls which calendar date is considered "today" for daily
task submissions. All stored timestamps and date keys use epoch milliseconds.

If Prisma reports a previously failed migration, resolve that migration state
before deploying the new `20260710190000_add_daily_task_submissions` migration.
Do not mark a migration as applied unless its SQL changes are already present in
the database.

## Daily Task Submission

All Daily Task routes require a JWT bearer token.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/daily-tasks` | Submit the authenticated employee's report for today |
| `GET` | `/daily-tasks?date=YYYY-MM-DD` | Reviewer view for SuperAdmin, HR, or Manager |
| `GET` | `/daily-tasks/mine?date=YYYY-MM-DD` | View the authenticated employee's report |
| `GET` | `/daily-tasks/:id` | View one permitted report |
| `PATCH` | `/daily-tasks/:id` | Update the employee's own report and Jira links |
| `POST` | `/daily-tasks/:id/attachments` | Upload up to 10 files using multipart field `files` |
| `DELETE` | `/daily-tasks/:id/attachments/:attachmentId` | Delete the employee's own attachment |

An employee can create one report per calendar date. A report can contain up to
25 Jira or related links. Uploaded file metadata includes the original and
stored names, URL, category, MIME type, byte size, upload epoch, and parent
submission. Files are written under `uploads/daily-tasks` and served from
`/uploads`.

Example report body:

```json
{
  "workDescription": "Implemented login validation and fixed employee filters.",
  "status": "Completed",
  "newIdeas": "Add automated authentication regression tests.",
  "jiraLinks": [
    {
      "label": "PORTAL-142",
      "url": "https://company.atlassian.net/browse/PORTAL-142"
    }
  ]
}
```

Interactive API documentation is available at
`http://localhost:5001/api-docs` while the server is running.
