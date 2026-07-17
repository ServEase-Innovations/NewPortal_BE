import {
  DailyTaskStatus,
  Prisma,
} from "@prisma/client";

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
    orderBy: {
      createdAt: "asc" as const,
    },
  },

  attachments: {
    orderBy: {
      uploadedAt: "asc" as const,
    },
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

export const createDailyTaskService = (
  data: CreateDailyTaskInput
) => {
  return prisma.dailyTaskSubmission.create({
    data: {
      employeeId: data.employeeId,

      workDescription:
        data.workDescription.trim(),

      status: data.status,

      newIdeas:
        data.newIdeas?.trim() || null,

      /*
       * Normalized date epoch, such as:
       * 2026-07-09 00:00:00 UTC
       */
      submissionDate: data.submissionDate,

      /*
       * Exact submission time.
       */
      submittedAt: data.submittedAt,
      updatedAt: data.submittedAt,

      jiraLinks:
        data.jiraLinks.length > 0
          ? {
              create: data.jiraLinks.map(
                (link) => ({
                  label:
                    link.label?.trim() || null,
                  url: link.url.trim(),
                  createdAt:
                    data.submittedAt,
                })
              ),
            }
          : undefined,
    },

    include: dailyTaskInclude,
  });
};

export const getDailyTasksService = (
  filters: DailyTaskFilters
) => {
  const where: Prisma.DailyTaskSubmissionWhereInput =
    {
      submissionDate:
        filters.submissionDate,
    };

  if (filters.employeeId !== undefined) {
    where.employeeId = filters.employeeId;
  }

  if (filters.status !== undefined) {
    where.status = filters.status;
  }

  return prisma.dailyTaskSubmission.findMany({
    where,

    include: dailyTaskInclude,

    orderBy: [
      {
        submittedAt: "desc",
      },
      {
        dailyTaskSubmissionId: "desc",
      },
    ],
  });
};

export const getDailyTaskByIdService = (
  id: bigint
) => {
  return prisma.dailyTaskSubmission.findUnique({
    where: {
      dailyTaskSubmissionId: id,
    },

    include: dailyTaskInclude,
  });
};

export const updateDailyTaskService = async (
  id: bigint,
  data: UpdateDailyTaskInput
) => {
  await prisma.$transaction(
    async (transaction) => {
      await transaction.dailyTaskSubmission.update({
        where: {
          dailyTaskSubmissionId: id,
        },

        data: {
          workDescription:
            data.workDescription !== undefined
              ? data.workDescription.trim()
              : undefined,

          status: data.status,

          newIdeas:
            data.newIdeas === undefined
              ? undefined
              : data.newIdeas?.trim() || null,

          updatedAt: data.updatedAt,
        },
      });

      if (data.jiraLinks !== undefined) {
        await transaction.dailyTaskJiraLink.deleteMany(
          {
            where: {
              dailyTaskSubmissionId: id,
            },
          }
        );

        if (data.jiraLinks.length > 0) {
          await transaction.dailyTaskJiraLink.createMany(
            {
              data: data.jiraLinks.map(
                (link) => ({
                  dailyTaskSubmissionId: id,
                  label:
                    link.label?.trim() || null,
                  url: link.url.trim(),
                  createdAt: data.updatedAt,
                })
              ),
            }
          );
        }
      }
    }
  );

  return getDailyTaskByIdService(id);
};

export const addDailyTaskAttachmentsService =
  async (
    dailyTaskSubmissionId: bigint,
    attachments: AttachmentInput[]
  ) => {
    if (attachments.length === 0) {
      return getDailyTaskByIdService(
        dailyTaskSubmissionId
      );
    }

    await prisma.dailyTaskAttachment.createMany({
      data: attachments.map(
        (attachment) => ({
          dailyTaskSubmissionId,

          fileName:
            attachment.fileName,

          storedFileName:
            attachment.storedFileName,

          fileUrl:
            attachment.fileUrl,

          fileType:
            attachment.fileType,

          mimeType:
            attachment.mimeType,

          fileSize:
            attachment.fileSize,

          uploadedAt:
            attachment.uploadedAt,
        })
      ),
    });

    return getDailyTaskByIdService(
      dailyTaskSubmissionId
    );
  };

export const getDailyTaskAttachmentByIdService =
  (id: bigint) => {
    return prisma.dailyTaskAttachment.findUnique({
      where: {
        dailyTaskAttachmentId: id,
      },

      include: {
        dailyTaskSubmission: {
          select: {
            employeeId: true,
          },
        },
      },
    });
  };

export const deleteDailyTaskAttachmentService =
  (id: bigint) => {
    return prisma.dailyTaskAttachment.delete({
      where: {
        dailyTaskAttachmentId: id,
      },
    });
  };
