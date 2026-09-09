import { z } from "zod";

// BigInt-backed employee IDs travel over JSON as numbers or numeric strings.
const employeeIdSchema = z.coerce
  .bigint({ message: "employeeId must be a valid numeric ID" })
  .positive("employeeId must be a positive number");

export const createTeamSchema = z.object({
  teamName: z
    .string()
    .min(3, "Team name must be at least 3 characters"),

  projectTitle: z
    .string()
    .min(3, "Project title is required"),

  projectSummary: z
    .string()
    .optional(),

  milestoneDeadline: z.coerce.date(),

  // Optional: SuperAdmin/HR may create a team on behalf of a specific
  // manager. Managers creating their own team may omit this - the service
  // defaults it to the authenticated manager's own employeeId.
  managerId: employeeIdSchema.optional(),
});

export const updateTeamSchema = z.object({
  teamName: z.string().min(3, "Team name must be at least 3 characters").optional(),
  projectTitle: z.string().min(3, "Project title is required").optional(),
  projectSummary: z.string().nullable().optional(),
  milestoneDeadline: z.coerce.date().optional(),
  // Reassigning ownership of a team to a different manager is restricted to
  // SuperAdmin/HR at the route/service layer, even though it's accepted here.
  managerId: employeeIdSchema.optional(),
});

export const addTeamMemberSchema = z.object({
  employeeId: employeeIdSchema,
});
