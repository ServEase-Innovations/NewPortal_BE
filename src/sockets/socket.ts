import { Server as HTTPServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import { EmployeeRole } from "@prisma/client";
import {
  sendMessageService,
  markConversationReadService,
  assertIsParticipant,
  getConversationParticipantIdsService,
  ConversationAccessError,
} from "../services/message.service";

interface AuthedSocket extends Socket {
  employee?: {
    employeeId: string;
    username: string;
    emailAddress: string;
    assignedRole: EmployeeRole;
  };
}

// employeeId (string) -> number of open sockets/tabs. Lets us tell the
// whole app "this person just went online/offline" without flapping every
// time they open a second tab.
const onlineEmployees = new Map<string, number>();

let ioInstance: Server | null = null;

export const getIO = (): Server => {
  if (!ioInstance) {
    throw new Error("Socket.io has not been initialized yet. Call initSocket(server) first.");
  }
  return ioInstance;
};

export const initSocket = (httpServer: HTTPServer, allowedOrigins: string[]): Server => {
  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  // Auth middleware — mirrors src/middleware/auth.middleware.ts but reads
  // the JWT from the handshake cookie instead of an Express request.
  io.use((socket: AuthedSocket, next) => {
    try {
      const rawCookies = socket.handshake.headers.cookie;
      const parsed = rawCookies ? cookie.parse(rawCookies) : {};
      const token =
        parsed.accessToken ||
        (socket.handshake.auth?.token as string | undefined);

      if (!token) {
        return next(new Error("Access denied. No token provided."));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;

      if (
        !decoded ||
        typeof decoded !== "object" ||
        !decoded.employeeId ||
        !decoded.username ||
        !decoded.assignedRole ||
        decoded.type !== "access"
      ) {
        return next(new Error("Invalid or expired token"));
      }

      socket.employee = {
        employeeId: String(decoded.employeeId),
        username: decoded.username,
        emailAddress: decoded.emailAddress,
        assignedRole: decoded.assignedRole as EmployeeRole,
      };
      next();
    } catch (err) {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket: AuthedSocket) => {
    const employee = socket.employee!;
    const employeeId = employee.employeeId;

    // Every employee has a personal room. This is how we push events
    // ("you have a new message", "your conversation list changed") to a
    // user regardless of which conversation room they currently have open.
    socket.join(`user:${employeeId}`);

    const wasOffline = !onlineEmployees.has(employeeId);
    onlineEmployees.set(employeeId, (onlineEmployees.get(employeeId) || 0) + 1);
    if (wasOffline) {
      io.emit("presence:update", { employeeId, status: "online" });
    }

    socket.on("conversation:join", async (conversationId: string) => {
      try {
        await assertIsParticipant(conversationId, BigInt(employeeId));
        socket.join(`conversation:${conversationId}`);
      } catch (err) {
        socket.emit("error", { message: "Cannot join conversation you're not part of" });
      }
    });

    socket.on("conversation:leave", (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on(
      "message:send",
      async (
        payload: {
          conversationId: string;
          content: string;
          messageType?: "Text" | "Image" | "File";
          fileUrl?: string;
          fileName?: string;
        },
        ack?: (response: any) => void
      ) => {
        try {
          const message = await sendMessageService(payload.conversationId, BigInt(employeeId), {
            content: payload.content,
            messageType: payload.messageType,
            fileUrl: payload.fileUrl,
            fileName: payload.fileName,
          });

          const serialized = serializeMessage(message);

          // Push to everyone actively viewing the conversation...
          io.to(`conversation:${payload.conversationId}`).emit("message:new", serialized);

          // ...and to every participant's personal room, so their contact
          // list / unread badge updates even if the chat isn't open.
          const participantIds = await getConversationParticipantIdsService(payload.conversationId);
          participantIds.forEach((id: bigint) => {
            io.to(`user:${id}`).emit("conversation:updated", {
              conversationId: payload.conversationId,
              lastMessage: serialized,
            });
          });

          ack?.({ success: true, message: serialized });
        } catch (err: any) {
          const message =
            err instanceof ConversationAccessError ? err.message : "Failed to send message";
          ack?.({ success: false, message });
        }
      }
    );

    socket.on("message:read", async (conversationId: string) => {
      try {
        const readAt = await markConversationReadService(conversationId, BigInt(employeeId));
        socket.to(`conversation:${conversationId}`).emit("message:read", {
          conversationId,
          employeeId,
          readAt: readAt.toString(),
        });
      } catch {
        // silently ignore — not fatal to the UX
      }
    });

    socket.on("typing:start", (conversationId: string) => {
      socket.to(`conversation:${conversationId}`).emit("typing:update", {
        conversationId,
        employeeId,
        isTyping: true,
      });
    });

    socket.on("typing:stop", (conversationId: string) => {
      socket.to(`conversation:${conversationId}`).emit("typing:update", {
        conversationId,
        employeeId,
        isTyping: false,
      });
    });

    socket.on("disconnect", () => {
      const remaining = (onlineEmployees.get(employeeId) || 1) - 1;
      if (remaining <= 0) {
        onlineEmployees.delete(employeeId);
        io.emit("presence:update", {
          employeeId,
          status: "offline",
          lastSeen: Date.now(),
        });
      } else {
        onlineEmployees.set(employeeId, remaining);
      }
    });
  });

  ioInstance = io;
  return io;
};

export const isEmployeeOnline = (employeeId: string) => onlineEmployees.has(employeeId);
export const getOnlineEmployeeIds = () => Array.from(onlineEmployees.keys());

// Shared BigInt-safe serializer for a message, used by both the REST
// controller and the socket layer so both paths emit identical shapes.
export const serializeMessage = (message: any): any => {
  if (message === null || message === undefined) return message;
  if (typeof message === "bigint") return message.toString();
  if (Array.isArray(message)) return message.map(serializeMessage);
  if (typeof message === "object") {
    const out: any = {};
    for (const key in message) {
      out[key] = serializeMessage(message[key]);
    }
    return out;
  }
  return message;
};
