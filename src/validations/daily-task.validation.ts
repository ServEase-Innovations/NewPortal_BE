import { z } from "zod";
import { dateOnlyToEpoch } from "../utils/epoch";

const dailyTaskStatusSchema = z.enum(["Pending", "Completed"]);

const dateOnlySchema = z.string().refine(
  (value) => {
    try {
      dateOnlyToEpoch(value);
      return true;
    } catch {
      return false;
    }
  },
  { message: "Date must be a valid calendar date in YYYY-MM-DD format" }
);

export const jiraLinkSchema = z.object({
  label: z.string().trim().min(1).max(100).optional(),
  url: z.string().trim().url("Each Jira link must be a valid URL").max(2048),
});

export const createDailyTaskSchema = z.object({
  workDescription: z.string().trim().min(1).max(20_000),
  status: dailyTaskStatusSchema.optional().default("Pending"),
  newIdeas: z.string().trim().max(10_000).optional(),
  jiraLinks: z.array(jiraLinkSchema).max(25).optional().default([]),
});

export const updateDailyTaskSchema = z
  .object({
    workDescription: z.string().trim().min(1).max(20_000).optional(),
    status: dailyTaskStatusSchema.optional(),
    newIdeas: z.string().trim().max(10_000).nullable().optional(),
    jiraLinks: z.array(jiraLinkSchema).max(25).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update",
  });

export const dailyTaskListQuerySchema = z.object({
  date: dateOnlySchema.optional(),
  employeeId: z.string().regex(/^\d+$/, "Employee ID must be an integer").optional(),
  status: dailyTaskStatusSchema.optional(),
});
