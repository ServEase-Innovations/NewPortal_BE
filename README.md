# NewPortal_BE

Employee management backend built with Express, TypeScript, Prisma, and
PostgreSQL. The existing Employee, Team, Attendance, and Daily Task APIs remain
available, with an additive payroll and payslip module.

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

## Payroll and Payslips

SuperAdmin and HR users can create a monthly payroll run, generate draft
payslips from active employee salary and attendance snapshots, adjust draft
line items, approve the run, and mark it paid. Approval locks the financial
snapshot so later employee salary edits do not alter historical payslips.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/payroll-runs` | Create a monthly payroll run |
| `POST` | `/payroll-runs/:id/generate` | Generate missing draft payslips |
| `PATCH` | `/payroll-runs/:id/approve` | Approve and lock all payslips |
| `PATCH` | `/payroll-runs/:id/mark-paid` | Record payment status and reference |
| `GET` | `/payslips` | HR/SuperAdmin payslip filters |
| `PATCH` | `/payslips/:id` | Adjust a draft payslip and recalculate totals |
| `GET` | `/payslips/mine` | Employee self-service payslip list |
| `GET` | `/payslips/:id/pdf` | Download an authorized payslip PDF |

Payroll generation treats Monday through Friday as working days. Attendance
records marked `Absent` create an unpaid-leave deduction; `Working` and
`OnLeave` do not reduce pay. Monetary values use Prisma Decimal rather than
JavaScript floating-point arithmetic. Deploy
`20260721150000_add_payslip_module` before using these routes.
