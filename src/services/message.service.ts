import prisma from "../prisma";

const now = (): bigint => BigInt(Date.now());

// Every employee (any role) is allowed to message every other employee —
// there is no role restriction here by design, matching the "chat with
// anyone regardless of role" requirement.

export class ConversationAccessError extends Error {
  constructor(message = "You are not a participant of this conversation") {
    super(message);
    this.name = "ConversationAccessError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

const participantSelect = {
  employeeId: true,
  fullName: true,
  emailAddress: true,
  assignedRole: true,
  assignedDepartment: true,
  isActive: true,
} as const;

export const assertIsParticipant = async (
  conversationId: string,
  employeeId: bigint
) => {
  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_employeeId: { conversationId, employeeId },
    },
  });
  if (!participant) {
    throw new ConversationAccessError();
  }
  return participant;
};

// Finds an existing 1:1 conversation between two employees, or creates one.
// This is what powers "start chatting with anyone" — WhatsApp-style, no
// approval step needed.
export const getOrCreateDirectConversationService = async (
  employeeId: bigint,
  otherEmployeeId: bigint
) => {
  if (employeeId === otherEmployeeId) {
    throw new Error("Cannot start a conversation with yourself");
  }

  const otherEmployee = await prisma.employee.findUnique({
    where: { employeeId: otherEmployeeId },
    select: participantSelect,
  });
  if (!otherEmployee) {
    throw new NotFoundError("The employee you're trying to message does not exist");
  }

  // Look for an existing non-group conversation containing exactly these
  // two participants.
  const existing = await prisma.conversation.findFirst({
    where: {
      isGroup: false,
      AND: [
        { participants: { some: { employeeId } } },
        { participants: { some: { employeeId: otherEmployeeId } } },
      ],
    },
    include: {
      participants: { include: { employee: { select: participantSelect } } },
    },
  });

  if (existing) {
    return existing;
  }

  const timestamp = now();
  const conversation = await prisma.conversation.create({
    data: {
      isGroup: false,
      createdById: employeeId,
      createdAt: timestamp,
      updatedAt: timestamp,
      participants: {
        create: [
          { employeeId, joinedAt: timestamp },
          { employeeId: otherEmployeeId, joinedAt: timestamp },
        ],
      },
    },
    include: {
      participants: { include: { employee: { select: participantSelect } } },
    },
  });

  return conversation;
};

export const createGroupConversationService = async (
  creatorId: bigint,
  participantIds: bigint[],
  groupName: string
) => {
  const uniqueIds = Array.from(new Set([creatorId, ...participantIds]));

  const foundEmployees = await prisma.employee.findMany({
    where: { employeeId: { in: uniqueIds } },
    select: { employeeId: true },
  });
  if (foundEmployees.length !== uniqueIds.length) {
    throw new NotFoundError("One or more selected employees do not exist");
  }

  const timestamp = now();
  const conversation = await prisma.conversation.create({
    data: {
      isGroup: true,
      groupName,
      createdById: creatorId,
      createdAt: timestamp,
      updatedAt: timestamp,
      participants: {
        create: uniqueIds.map((employeeId) => ({ employeeId, joinedAt: timestamp })),
      },
    },
    include: {
      participants: { include: { employee: { select: participantSelect } } },
    },
  });

  return conversation;
};

// Returns every conversation the employee belongs to, newest activity
// first, with the last message preview + unread count — everything the
// contact list in the UI needs in a single call.
export const listConversationsForEmployeeService = async (employeeId: bigint) => {
  const memberships = await prisma.conversationParticipant.findMany({
    where: { employeeId },
    include: {
      conversation: {
        include: {
          participants: { include: { employee: { select: participantSelect } } },
          messages: {
            where: { isDeleted: false },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { conversation: { lastMessageAt: "desc" } },
  });

  const results = await Promise.all(
    memberships.map(async (membership: (typeof memberships)[number]) => {
      const { conversation } = membership;
      const lastReadAt = membership.lastReadAt ?? BigInt(0);

      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conversation.conversationId,
          senderId: { not: employeeId },
          createdAt: { gt: lastReadAt },
          isDeleted: false,
        },
      });

      const otherParticipants = conversation.participants
        .filter((p: any) => p.employeeId !== employeeId)
        .map((p: any) => p.employee);

      return {
        conversation,
        lastMessage: conversation.messages[0] ?? null,
        otherParticipants,
        unreadCount,
      };
    })
  );

  return results;
};

export const getConversationMessagesService = async (
  conversationId: string,
  employeeId: bigint,
  cursor?: bigint,
  limit = 30
) => {
  await assertIsParticipant(conversationId, employeeId);

  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      isDeleted: false,
      ...(cursor ? { createdAt: { lt: cursor } } : {}),
    },
    include: { sender: { select: participantSelect } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  // Return oldest -> newest, the way a chat window renders.
  return messages.reverse();
};

interface SendMessageInput {
  content: string;
  messageType?: "Text" | "Image" | "File";
  fileUrl?: string;
  fileName?: string;
}

export const sendMessageService = async (
  conversationId: string,
  senderId: bigint,
  input: SendMessageInput
) => {
  await assertIsParticipant(conversationId, senderId);

  const timestamp = now();
  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId,
      content: input.content,
      messageType: input.messageType ?? "Text",
      fileUrl: input.fileUrl,
      fileName: input.fileName,
      createdAt: timestamp,
    },
    include: { sender: { select: participantSelect } },
  });

  await prisma.conversation.update({
    where: { conversationId },
    data: { updatedAt: timestamp, lastMessageAt: timestamp },
  });

  // The sender has obviously "read" up to the message they just sent.
  await prisma.conversationParticipant.update({
    where: { conversationId_employeeId: { conversationId, employeeId: senderId } },
    data: { lastReadAt: timestamp },
  });

  return message;
};

export const markConversationReadService = async (
  conversationId: string,
  employeeId: bigint
) => {
  await assertIsParticipant(conversationId, employeeId);

  const timestamp = now();
  await prisma.conversationParticipant.update({
    where: { conversationId_employeeId: { conversationId, employeeId } },
    data: { lastReadAt: timestamp },
  });

  return timestamp;
};

// Returns the list of employeeIds belonging to a conversation — used by the
// socket layer to know who to push realtime events to.
export const getConversationParticipantIdsService = async (conversationId: string) => {
  const participants = await prisma.conversationParticipant.findMany({
    where: { conversationId },
    select: { employeeId: true },
  });
  return participants.map((p: { employeeId: bigint }) => p.employeeId);
};
