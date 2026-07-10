import { DailyTaskStatus, Prisma } from "@prisma/client";
import prisma from "../prisma";

const dailyTaskInclude = {
  employee: {
    select: {
      employeeId: true,
      fullName: true,
      emailAddress: true,
      username: true,
      assignedRole: true,
      assignedDepartment: true,
      teamId: true,
    },
  },
  jiraLinks: {
    orderBy: { createdAt: "asc" as const },
  },
  attachments: {
    orderBy: { uploadedAt: "asc" as const },
  },
} satisfies Prisma.DailyTaskSubmissionInclude;

export interface JiraLinkInput {
  label?: string;
  url: string;
}

export interface CreateDailyTaskInput {
  employeeId: bigint;
  workDescription: string;
  status: DailyTaskStatus;
  newIdeas?: string;
  jiraLinks: JiraLinkInput[];
  submissionDate: bigint;
  submittedAt: bigint;
}

export interface DailyTaskFilters {
  submissionDate: bigint;
  employeeId?: bigint;
  status?: DailyTaskStatus;
}

export interface UpdateDailyTaskInput {
  workDescription?: string;
  status?: DailyTaskStatus;
  newIdeas?: string | null;
  jiraLinks?: JiraLinkInput[];
  updatedAt: bigint;
}

export interface AttachmentInput {
  fileName: string;
  storedFileName: string;
  fileUrl: string;
  fileType: string;
  mimeType: string;
  fileSize: bigint;
  uploadedAt: bigint;
}

export const createDailyTaskService = (data: CreateDailyTaskInput) =>
  prisma.dailyTaskSubmission.create({
    data: {
      employeeId: data.employeeId,
      workDescription: data.workDescription,
      status: data.status,
      newIdeas: data.newIdeas || null,
      submissionDate: data.submissionDate,
      submittedAt: data.submittedAt,
      updatedAt: data.submittedAt,
      jiraLinks: data.jiraLinks.length
        ? {
            create: data.jiraLinks.map((link) => ({
              label: link.label,
              url: link.url,
              createdAt: data.submittedAt,
            })),
          }
        : undefined,
    },
    include: dailyTaskInclude,
  });

export const getDailyTasksService = (filters: DailyTaskFilters) =>
  prisma.dailyTaskSubmission.findMany({
    where: {
      submissionDate: filters.submissionDate,
      employeeId: filters.employeeId,
      status: filters.status,
    },
    include: dailyTaskInclude,
    orderBy: [{ submittedAt: "desc" }, { dailyTaskSubmissionId: "desc" }],
  });

export const getDailyTaskByIdService = (id: bigint) =>
  prisma.dailyTaskSubmission.findUnique({
    where: { dailyTaskSubmissionId: id },
    include: dailyTaskInclude,
  });

export const updateDailyTaskService = async (
  id: bigint,
  data: UpdateDailyTaskInput
) => {
  await prisma.$transaction(async (transaction) => {
    await transaction.dailyTaskSubmission.update({
      where: { dailyTaskSubmissionId: id },
      data: {
        workDescription: data.workDescription,
        status: data.status,
        newIdeas: data.newIdeas,
        updatedAt: data.updatedAt,
      },
    });

    if (data.jiraLinks !== undefined) {
      await transaction.dailyTaskJiraLink.deleteMany({
        where: { dailyTaskSubmissionId: id },
      });

      if (data.jiraLinks.length) {
        await transaction.dailyTaskJiraLink.createMany({
          data: data.jiraLinks.map((link) => ({
            dailyTaskSubmissionId: id,
            label: link.label,
            url: link.url,
            createdAt: data.updatedAt,
          })),
        });
      }
    }
  });

  return getDailyTaskByIdService(id);
};

export const addDailyTaskAttachmentsService = async (
  dailyTaskSubmissionId: bigint,
  attachments: AttachmentInput[]
) => {
  await prisma.dailyTaskAttachment.createMany({
    data: attachments.map((attachment) => ({
      dailyTaskSubmissionId,
      ...attachment,
    })),
  });

  return getDailyTaskByIdService(dailyTaskSubmissionId);
};

export const getDailyTaskAttachmentByIdService = (id: bigint) =>
  prisma.dailyTaskAttachment.findUnique({
    where: { dailyTaskAttachmentId: id },
    include: {
      dailyTaskSubmission: {
        select: { employeeId: true },
      },
    },
  });

export const deleteDailyTaskAttachmentService = (id: bigint) =>
  prisma.dailyTaskAttachment.delete({
    where: { dailyTaskAttachmentId: id },
  });
