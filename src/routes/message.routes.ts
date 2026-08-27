import { Router } from "express";
import {
  getConversations,
  createConversation,
  getMessages,
  sendMessage,
  markConversationRead,
} from "../controllers/message.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Every route requires a logged-in employee. There is NO role restriction
// anywhere in this file on purpose — every role (SuperAdmin, Manager, HR,
// Developer, Marketing, CustomStaff) can message every other role.
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Messaging
 *   description: WhatsApp-style chat between any two (or more) employees, any role
 */

/**
 * @swagger
 * /messages/conversations:
 *   get:
 *     summary: List my conversations
 *     description: Returns every conversation the logged-in employee belongs to, newest activity first, with last message preview and unread count.
 *     tags: [Messaging]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Conversations retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get("/conversations", getConversations);

/**
 * @swagger
 * /messages/conversations:
 *   post:
 *     summary: Start (or resume) a conversation
 *     description: |
 *       Pass `participantId` to get-or-create a 1:1 chat with any other employee
 *       (any role). Pass `participantIds` + `groupName` to create a group chat.
 *     tags: [Messaging]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               participantId:
 *                 type: string
 *                 example: "5"
 *               participantIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["5", "6", "7"]
 *               groupName:
 *                 type: string
 *                 example: "Project Phoenix"
 *     responses:
 *       201:
 *         description: Conversation created (or existing one returned)
 *       400:
 *         description: Invalid request
 *       404:
 *         description: One or more employees not found
 */
router.post("/conversations", createConversation);

/**
 * @swagger
 * /messages/conversations/{conversationId}/messages:
 *   get:
 *     summary: Get messages in a conversation (paginated, newest first page)
 *     tags: [Messaging]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: conversationId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: cursor
 *         in: query
 *         schema:
 *           type: string
 *         description: Epoch ms of the oldest message already loaded — fetches messages older than this
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: Messages retrieved, oldest to newest
 *       403:
 *         description: Not a participant of this conversation
 */
router.get("/conversations/:conversationId/messages", getMessages);

/**
 * @swagger
 * /messages/conversations/{conversationId}/messages:
 *   post:
 *     summary: Send a message (REST fallback; realtime clients should prefer the socket "message:send" event)
 *     tags: [Messaging]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: conversationId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *                 example: "Hey, got a minute?"
 *               messageType:
 *                 type: string
 *                 enum: [Text, Image, File]
 *               fileUrl:
 *                 type: string
 *               fileName:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message sent
 *       403:
 *         description: Not a participant of this conversation
 */
router.post("/conversations/:conversationId/messages", sendMessage);

/**
 * @swagger
 * /messages/conversations/{conversationId}/read:
 *   put:
 *     summary: Mark a conversation as read up to now
 *     tags: [Messaging]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: conversationId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Marked as read
 */
router.put("/conversations/:conversationId/read", markConversationRead);

export default router;
