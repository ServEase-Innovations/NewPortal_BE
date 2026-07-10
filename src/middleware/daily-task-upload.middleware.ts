import { randomUUID } from "crypto";
import { mkdirSync } from "fs";
import { unlink } from "fs/promises";
import path from "path";
import { NextFunction, Request, Response } from "express";
import multer from "multer";

export const dailyTaskUploadDirectory = path.resolve(
  process.cwd(),
  "uploads",
  "daily-tasks"
);

mkdirSync(dailyTaskUploadDirectory, { recursive: true });

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/vnd.rar",
  "application/x-rar-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/json",
  "text/csv",
  "text/plain",
]);

const isAllowedMimeType = (mimeType: string): boolean =>
  mimeType.startsWith("image/") ||
  mimeType.startsWith("video/") ||
  allowedMimeTypes.has(mimeType);

const configuredLimit = Number(process.env.DAILY_TASK_MAX_FILE_SIZE_MB || 100);
const maxFileSizeMb =
  Number.isFinite(configuredLimit) && configuredLimit > 0
    ? configuredLimit
    : 100;

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, dailyTaskUploadDirectory);
  },
  filename: (_req, file, callback) => {
    const extension = path
      .extname(file.originalname)
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, "")
      .slice(0, 12);

    callback(null, `${Date.now()}-${randomUUID()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: Math.floor(maxFileSizeMb * 1024 * 1024),
    files: 10,
  },
  fileFilter: (_req, file, callback) => {
    if (!isAllowedMimeType(file.mimetype)) {
      callback(
        new Error(
          "Unsupported file type. Upload images, videos, PDFs, documents, spreadsheets, presentations, text, JSON, CSV, ZIP, or RAR files."
        )
      );
      return;
    }

    callback(null, true);
  },
});

export const handleDailyTaskUpload = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  upload.array("files", 10)(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    const files = (req.files as Express.Multer.File[] | undefined) || [];
    const message =
      error instanceof multer.MulterError
        ? error.code === "LIMIT_FILE_SIZE"
          ? `Each file must be ${maxFileSizeMb} MB or smaller`
          : error.message
        : error instanceof Error
          ? error.message
          : "File upload failed";

    void removeUploadedFiles(files).finally(() => {
      res.status(400).json({ message });
    });
  });
};

export const getUploadedFileType = (mimeType: string): string => {
  if (mimeType.startsWith("image/")) return "Image";
  if (mimeType.startsWith("video/")) return "Video";
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.includes("zip") || mimeType.includes("rar")) return "Archive";
  return "Document";
};

export const getUploadedFileUrl = (storedFileName: string): string => {
  const relativeUrl = `/uploads/daily-tasks/${storedFileName}`;
  const publicBaseUrl = process.env.PUBLIC_BASE_URL?.replace(/\/$/, "");
  return publicBaseUrl ? `${publicBaseUrl}${relativeUrl}` : relativeUrl;
};

export const removeUploadedFiles = async (
  files: Express.Multer.File[]
): Promise<void> => {
  await Promise.allSettled(files.map((file) => unlink(file.path)));
};
