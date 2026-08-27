import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import {
  getOrCreateDirectConversationService,
  createGroupConversationService,
  listConversationsForEmployeeService,
  getConversationMessagesService,
  sendMessageService,
  markConversationReadService,
  ConversationAccessError,
  NotFoundError,
} from "../services/message.service";
import { serializeMessage, getIO } from "../sockets/socket";
import {
  createConversationSchema,
  sendMessageSchema,
  getMessagesQuerySchema,
} from "../validations/message.validation";

const handleServiceError = (res: Response, error: unknown) => {
  if (error instanceof ConversationAccessError) {
    return res.status(403).json({ message: error.message });
  }
  if (error instanceof NotFoundError) {
    return res.status(404).json({ message: error.message });
  }
  console.error("❌ Messages error:", error);
  return res.status(500).json({ message: "Something went wrong" });
};

// GET /messages/conversations
// Every conversation the logged-in employee belongs to — 1:1 or group,
// with whoever else is in it, regardless of their role.
export const getConversations = async (req: AuthRequest, res: Response) => {
  try {
    const employeeId = BigInt(req.employee!.employeeId);
    const results = await listConversationsForEmployeeService(employeeId);
    res.status(200).json(serializeMessage(results));
  } catch (error) {
    handleServiceError(res, error);
  }
};

// POST /messages/conversations
// { participantId }               -> get-or-create a 1:1 chat
// { participantIds[], groupName } -> create a group chat
export const createConversation = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = createConversationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid request" });
    }

    const employeeId = BigInt(req.employee!.employeeId);
    const { participantId, participantIds, groupName } = parsed.data;

    let conversation;
    if (participantIds && participantIds.length > 0) {
      conversation = await createGroupConversationService(
        employeeId,
        participantIds.map((id) => BigInt(id)),
        groupName?.trim() || "New Group"
      );
    } else {
      conversation = await getOrCreateDirectConversationService(
        employeeId,
        BigInt(participantId!)
      );
    }

    res.status(201).json(serializeMessage(conversation));
  } catch (error) {
    handleServiceError(res, error);
  }
};

// GET /messages/conversations/:conversationId/messages?cursor=&limit=
export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    const employeeId = BigInt(req.employee!.employeeId);
    const conversationId = String(req.params.conversationId);
    const parsedQuery = getMessagesQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return res.status(400).json({ message: "Invalid query parameters" });
    }

    const { cursor, limit } = parsedQuery.data;
    const messages = await getConversationMessagesService(
      conversationId,
      employeeId,
      cursor ? BigInt(cursor) : undefined,
      limit
    );

    res.status(200).json(serializeMessage(messages));
  } catch (error) {
    handleServiceError(res, error);
  }
};

// POST /messages/conversations/:conversationId/messages
// REST fallback for sending (also used by clients not connected over the
// socket). Broadcasts through the same socket.io instance so both delivery
// paths behave identically for everyone else in the conversation.
export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const employeeId = BigInt(req.employee!.employeeId);
    const conversationId = String(req.params.conversationId);
    const parsed = sendMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid request" });
    }

    const message = await sendMessageService(conversationId, employeeId, parsed.data);
    const serialized = serializeMessage(message);

    try {
      const io = getIO();
      io.to(`conversation:${conversationId}`).emit("message:new", serialized);
      io.to(`conversation:${conversationId}`).emit("conversation:updated", {
        conversationId,
        lastMessage: serialized,
      });
    } catch {
      // Socket layer not initialized (e.g. running in a test environment) —
      // the message is still safely persisted, it just won't push live.
    }

    res.status(201).json(serialized);
  } catch (error) {
    handleServiceError(res, error);
  }
};

// PUT /messages/conversations/:conversationId/read
export const markConversationRead = async (req: AuthRequest, res: Response) => {
  try {
    const employeeId = BigInt(req.employee!.employeeId);
    const conversationId = String(req.params.conversationId);
    const readAt = await markConversationReadService(conversationId, employeeId);
    res.status(200).json({ conversationId, readAt: readAt.toString() });
  } catch (error) {
    handleServiceError(res, error);
  }
};
