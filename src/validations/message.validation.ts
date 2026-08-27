import { z } from "zod";

// POST /messages/conversations
// Direct chat:  { participantId: "5" }
// Group chat:   { participantIds: ["5","6","7"], groupName: "Project Phoenix" }
export const createConversationSchema = z
  .object({
    participantId: z.string().regex(/^\d+$/, "participantId must be numeric").optional(),
    participantIds: z
      .array(z.string().regex(/^\d+$/, "participantIds must be numeric"))
      .min(2, "A group needs at least 2 other participants")
      .optional(),
    groupName: z.string().trim().min(1).max(100).optional(),
  })
  .refine((data) => data.participantId || data.participantIds, {
    message: "Provide either participantId (1:1 chat) or participantIds (group chat)",
  });

// POST /messages/conversations/:conversationId/messages
export const sendMessageSchema = z.object({
  content: z.string().trim().min(1, "Message content cannot be empty").max(5000),
  messageType: z.enum(["Text", "Image", "File"]).optional().default("Text"),
  fileUrl: z.string().url().optional(),
  fileName: z.string().max(255).optional(),
});

// GET /messages/conversations/:conversationId/messages?cursor=&limit=
export const getMessagesQuerySchema = z.object({
  cursor: z.string().regex(/^\d+$/).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(30),
});
