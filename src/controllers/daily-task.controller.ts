import path from "path";
import { unlink } from "fs/promises";
import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import {
  dailyTaskUploadDirectory,
  getUploadedFileType,
  getUploadedFileUrl,
  removeUploadedFiles,
} from "../middleware/daily-task-upload.middleware";
import {
  addDailyTaskAttachmentsService,
  createDailyTaskService,
  deleteDailyTaskAttachmentService,
  getDailyTaskAttachmentByIdService,
  getDailyTaskByIdService,
  getDailyTasksService,
  updateDailyTaskService,
} from "../services/daily-task.service";
import {
  createDailyTaskSchema,
  dailyTaskListQuerySchema,
  updateDailyTaskSchema,
} from "../validations/daily-task.validation";
import {
  currentDateEpoch,
  dateOnlyToEpoch,
  epochDayToDateOnly,
  epochToIso,
  nowEpoch,
} from "../utils/epoch";

const reviewerRoles = new Set(["SuperAdmin", "HR", "Manager"]);

const isReviewer = (req: AuthRequest): boolean =>
  Boolean(req.employee && reviewerRoles.has(req.employee.assignedRole));

const isOwner = (req: AuthRequest, employeeId: bigint): boolean =>
  req.employee?.employeeId === employeeId.toString();

const parsePositiveBigInt = (value: unknown): bigint | null => {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;

  const parsed = BigInt(value);
  return parsed > 0n ? parsed : null;
};

const serializeDailyTask = (task: any) => ({
  dailyTaskSubmissionId: task.dailyTaskSubmissionId.toString(),
  employeeId: task.employeeId.toString(),
  workDescription: task.workDescription,
  status: task.status,
  newIdeas: task.newIdeas,
  submissionDate: epochDayToDateOnly(task.submissionDate),
  submissionDateEpoch: task.submissionDate.toString(),
  submittedAt: epochToIso(task.submittedAt),
  submittedAtEpoch: task.submittedAt.toString(),
  updatedAt: epochToIso(task.updatedAt),
  updatedAtEpoch: task.updatedAt.toString(),
  employee: task.employee
    ? {
        ...task.employee,
        employeeId: task.employee.employeeId.toString(),
      }
    : undefined,
  jiraLinks: (task.jiraLinks || []).map((link: any) => ({
    dailyTaskJiraLinkId: link.dailyTaskJiraLinkId.toString(),
    label: link.label,
    url: link.url,
    createdAt: epochToIso(link.createdAt),
    createdAtEpoch: link.createdAt.toString(),
  })),
  attachments: (task.attachments || []).map((attachment: any) => ({
    dailyTaskAttachmentId: attachment.dailyTaskAttachmentId.toString(),
    fileName: attachment.fileName,
    fileUrl: attachment.fileUrl,
    fileType: attachment.fileType,
    mimeType: attachment.mimeType,
    fileSize: Number(attachment.fileSize),
    uploadedAt: epochToIso(attachment.uploadedAt),
    uploadedAtEpoch: attachment.uploadedAt.toString(),
  })),
});

const sendUnexpectedError = (
  res: Response,
  error: unknown,
  message: string
) => {
  const details =
    error instanceof Error ? error.message : String(error);

  console.error(message, details);

  return res.status(500).json({
    message,
    error:
      process.env.NODE_ENV === "development"
        ? details
        : undefined,
  });
};

export const createDailyTask = async (req: AuthRequest, res: Response) => {
  if (!req.employee) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const result = createDailyTaskSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: result.error.flatten(),
    });
  }

  try {
    const submittedAt = nowEpoch();
    const task = await createDailyTaskService({
      employeeId: BigInt(req.employee.employeeId),
      ...result.data,
      submissionDate: currentDateEpoch(),
      submittedAt,
    });

    return res.status(201).json({
      message: "Daily task submitted successfully",
      dailyTask: serializeDailyTask(task),
    });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return res.status(409).json({
        message: "You have already submitted a daily task for today",
      });
    }

    if (error?.code === "P2003") {
      return res.status(404).json({ message: "Employee not found" });
    }

    return sendUnexpectedError(res, error, "Failed to submit daily task");
  }
};

export const getDailyTasks = async (req: AuthRequest, res: Response) => {
  const result = dailyTaskListQuerySchema.safeParse(req.query);

  if (!result.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: result.error.flatten(),
    });
  }

  try {
    const submissionDate = result.data.date
      ? dateOnlyToEpoch(result.data.date)
      : currentDateEpoch();
    const tasks = await getDailyTasksService({
      submissionDate,
      employeeId: result.data.employeeId
        ? BigInt(result.data.employeeId)
        : undefined,
      status: result.data.status,
    });

    return res.json({
      date: epochDayToDateOnly(submissionDate),
      count: tasks.length,
      dailyTasks: tasks.map(serializeDailyTask),
    });
  } catch (error) {
    return sendUnexpectedError(res, error, "Failed to fetch daily tasks");
  }
};

export const getMyDailyTasks = async (req: AuthRequest, res: Response) => {
  if (!req.employee) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const result = dailyTaskListQuerySchema.safeParse(req.query);

  if (!result.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: result.error.flatten(),
    });
  }

  try {
    const submissionDate = result.data.date
      ? dateOnlyToEpoch(result.data.date)
      : currentDateEpoch();
    const tasks = await getDailyTasksService({
      submissionDate,
      employeeId: BigInt(req.employee.employeeId),
      status: result.data.status,
    });

    return res.json({
      date: epochDayToDateOnly(submissionDate),
      count: tasks.length,
      dailyTasks: tasks.map(serializeDailyTask),
    });
  } catch (error) {
    return sendUnexpectedError(res, error, "Failed to fetch your daily tasks");
  }
};

export const getDailyTaskById = async (req: AuthRequest, res: Response) => {
  const id = parsePositiveBigInt(req.params.id);

  if (!id) {
    return res.status(400).json({ message: "Invalid daily task ID" });
  }

  try {
    const task = await getDailyTaskByIdService(id);

    if (!task) {
      return res.status(404).json({ message: "Daily task not found" });
    }

    if (!isOwner(req, task.employeeId) && !isReviewer(req)) {
      return res.status(403).json({ message: "You cannot view this daily task" });
    }

    return res.json({ dailyTask: serializeDailyTask(task) });
  } catch (error) {
    return sendUnexpectedError(res, error, "Failed to fetch daily task");
  }
};

export const updateDailyTask = async (req: AuthRequest, res: Response) => {
  const id = parsePositiveBigInt(req.params.id);

  if (!id) {
    return res.status(400).json({ message: "Invalid daily task ID" });
  }

  const result = updateDailyTaskSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: result.error.flatten(),
    });
  }

  try {
    const existingTask = await getDailyTaskByIdService(id);

    if (!existingTask) {
      return res.status(404).json({ message: "Daily task not found" });
    }

    if (!isOwner(req, existingTask.employeeId)) {
      return res.status(403).json({
        message: "Only the employee who submitted this task can update it",
      });
    }

    const task = await updateDailyTaskService(id, {
      ...result.data,
      updatedAt: nowEpoch(),
    });

    return res.json({
      message: "Daily task updated successfully",
      dailyTask: serializeDailyTask(task),
    });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return res.status(404).json({ message: "Daily task not found" });
    }

    return sendUnexpectedError(res, error, "Failed to update daily task");
  }
};

export const uploadDailyTaskAttachments = async (
  req: AuthRequest,
  res: Response
) => {
  const files = (req.files as Express.Multer.File[] | undefined) || [];
  const id = parsePositiveBigInt(req.params.id);

  if (!id) {
    await removeUploadedFiles(files);
    return res.status(400).json({ message: "Invalid daily task ID" });
  }

  if (!files.length) {
    return res.status(400).json({
      message: "Upload at least one file using the 'files' form field",
    });
  }

  try {
    const task = await getDailyTaskByIdService(id);

    if (!task) {
      await removeUploadedFiles(files);
      return res.status(404).json({ message: "Daily task not found" });
    }

    if (!isOwner(req, task.employeeId)) {
      await removeUploadedFiles(files);
      return res.status(403).json({
        message: "Only the employee who submitted this task can add attachments",
      });
    }

    const uploadedAt = nowEpoch();
    const updatedTask = await addDailyTaskAttachmentsService(
      id,
      files.map((file) => ({
        fileName: file.originalname,
        storedFileName: file.filename,
        fileUrl: getUploadedFileUrl(file.filename),
        fileType: getUploadedFileType(file.mimetype),
        mimeType: file.mimetype,
        fileSize: BigInt(file.size),
        uploadedAt,
      }))
    );

    return res.status(201).json({
      message: "Attachments uploaded successfully",
      dailyTask: serializeDailyTask(updatedTask),
    });
  } catch (error) {
    await removeUploadedFiles(files);
    return sendUnexpectedError(res, error, "Failed to upload attachments");
  }
};

export const deleteDailyTaskAttachment = async (
  req: AuthRequest,
  res: Response
) => {
  const dailyTaskId = parsePositiveBigInt(req.params.id);
  const attachmentId = parsePositiveBigInt(req.params.attachmentId);

  if (!dailyTaskId || !attachmentId) {
    return res.status(400).json({ message: "Invalid daily task or attachment ID" });
  }

  try {
    const attachment = await getDailyTaskAttachmentByIdService(attachmentId);

    if (!attachment) {
      return res.status(404).json({ message: "Attachment not found" });
    }

    if (attachment.dailyTaskSubmissionId !== dailyTaskId) {
      return res.status(404).json({ message: "Attachment not found for this daily task" });
    }

    if (!isOwner(req, attachment.dailyTaskSubmission.employeeId)) {
      return res.status(403).json({
        message: "Only the employee who uploaded this attachment can delete it",
      });
    }

    await deleteDailyTaskAttachmentService(attachmentId);

    const safeStoredName = path.basename(attachment.storedFileName);
    if (safeStoredName === attachment.storedFileName) {
      await unlink(path.join(dailyTaskUploadDirectory, safeStoredName)).catch(
        (error) => console.warn("Attachment file could not be removed:", error)
      );
    }

    return res.json({ message: "Attachment deleted successfully" });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return res.status(404).json({ message: "Attachment not found" });
    }

    return sendUnexpectedError(res, error, "Failed to delete attachment");
  }
};
