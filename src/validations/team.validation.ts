import { z } from "zod";

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
});