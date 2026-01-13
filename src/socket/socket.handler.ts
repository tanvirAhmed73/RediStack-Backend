import logger from "../utlis/logger";
import type { Socket } from "socket.io";
import {
  sendDirectMessage,
  sendGroupMessage,
  getDirectMessageHistory,
  getGroupMessageHistory,
  setUserOnline,
  setUserOffline,
  isUserOnline,
  getDirectMessageRoomId,
  markMessageDelivered,
  markMessageRead,
  getMessageDeliveryStatus,
  addGroupMember,
  removeGroupMember,
  getOnlineUsers,
} from "../services/chat.service";
import { publishNotification } from "../services/chat.pubsub";

export const registerSocketHandlers = (socket: Socket) => {
  const userId = socket.data.userId;

  if (!userId) {
    logger.error("Socket connected without userId - authentication may have failed");
    socket.disconnect();
    return;
  }

  logger.info(`Socket connected for user: ${userId}`);

  // Join user's personal room for direct messages
  socket.join(`user:${userId}`);

  // Set user online
  setUserOnline(userId, socket.id).catch((err) => {
    logger.error(`Error setting user online: ${err}`);
  });

  // Ping/Pong handler
  socket.on("ping", () => {
    socket.emit("pong");
  });

  // ========== DIRECT MESSAGE HANDLERS ==========

  /**
   * Send a direct message to another user
   * Event: chat:send-dm
   * Payload: { recipientId: string, message: string, metadata?: object }
   */
  socket.on("chat:send-dm", async (data: { recipientId: string; message: string; metadata?: any }) => {
    try {
      const { recipientId, message, metadata } = data;

      if (!recipientId || !message) {
        socket.emit("chat:error", { message: "recipientId and message are required" });
        return;
      }

      if (recipientId === userId) {
        socket.emit("chat:error", { message: "Cannot send message to yourself" });
        return;
      }

      await sendDirectMessage(userId, recipientId, message, metadata);
      socket.emit("chat:sent", { type: "dm", recipientId, message });
    } catch (error: any) {
      logger.error(`Error sending DM: ${error}`);
      socket.emit("chat:error", { message: error.message || "Failed to send message" });
    }
  });

  /**
   * Get message history for a direct message conversation
   * Event: chat:get-dm-history
   * Payload: { otherUserId: string, limit?: number }
   */
  socket.on("chat:get-dm-history", async (data: { otherUserId: string; limit?: number }) => {
    try {
      const { otherUserId, limit = 50 } = data;

      if (!otherUserId) {
        socket.emit("chat:error", { message: "otherUserId is required" });
        return;
      }

      const history = await getDirectMessageHistory(userId, otherUserId, limit);
      socket.emit("chat:dm-history", { otherUserId, messages: history });
    } catch (error: any) {
      logger.error(`Error getting DM history: ${error}`);
      socket.emit("chat:error", { message: error.message || "Failed to get message history" });
    }
  });

  // ========== GROUP CHAT HANDLERS ==========

  /**
   * Join a group chat room
   * Event: chat:join-group
   * Payload: { groupId: string }
   */
  socket.on("chat:join-group", async (data: { groupId: string }) => {
    try {
      const { groupId } = data;

      if (!groupId) {
        socket.emit("chat:error", { message: "groupId is required" });
        return;
      }

      socket.join(`group:${groupId}`);
      logger.info(`User ${userId} joined group ${groupId}`);

      // Notify others in the group
      socket.to(`group:${groupId}`).emit("chat:user-joined", {
        groupId,
        userId,
        timestamp: Date.now(),
      });

      socket.emit("chat:joined-group", { groupId });
    } catch (error: any) {
      logger.error(`Error joining group: ${error}`);
      socket.emit("chat:error", { message: error.message || "Failed to join group" });
    }
  });

  /**
   * Leave a group chat room
   * Event: chat:leave-group
   * Payload: { groupId: string }
   */
  socket.on("chat:leave-group", async (data: { groupId: string }) => {
    try {
      const { groupId } = data;

      if (!groupId) {
        socket.emit("chat:error", { message: "groupId is required" });
        return;
      }

      socket.leave(`group:${groupId}`);
      
      // Remove user from group members set
      await removeGroupMember(groupId, userId);
      
      logger.info(`User ${userId} left group ${groupId}`);

      // Notify others in the group
      socket.to(`group:${groupId}`).emit("chat:user-left", {
        groupId,
        userId,
        timestamp: Date.now(),
      });

      socket.emit("chat:left-group", { groupId });
    } catch (error: any) {
      logger.error(`Error leaving group: ${error}`);
      socket.emit("chat:error", { message: error.message || "Failed to leave group" });
    }
  });

  /**
   * Send a message to a group
   * Event: chat:send-group
   * Payload: { groupId: string, message: string, metadata?: object }
   */
  socket.on("chat:send-group", async (data: { groupId: string; message: string; metadata?: any }) => {
    try {
      const { groupId, message, metadata } = data;

      if (!groupId || !message) {
        socket.emit("chat:error", { message: "groupId and message are required" });
        return;
      }

      // Check if user is in the group
      const rooms = Array.from(socket.rooms);
      if (!rooms.includes(`group:${groupId}`)) {
        socket.emit("chat:error", { message: "You must join the group first" });
        return;
      }

      const messageId = await sendGroupMessage(userId, groupId, message, metadata);
      socket.emit("chat:sent", { type: "group", groupId, message, messageId });
    } catch (error: any) {
      logger.error(`Error sending group message: ${error}`);
      socket.emit("chat:error", { message: error.message || "Failed to send group message" });
    }
  });

  /**
   * Get message history for a group
   * Event: chat:get-group-history
   * Payload: { groupId: string, limit?: number }
   */
  socket.on("chat:get-group-history", async (data: { groupId: string; limit?: number }) => {
    try {
      const { groupId, limit = 50 } = data;

      if (!groupId) {
        socket.emit("chat:error", { message: "groupId is required" });
        return;
      }

      const history = await getGroupMessageHistory(groupId, limit);
      socket.emit("chat:group-history", { groupId, messages: history });
    } catch (error: any) {
      logger.error(`Error getting group history: ${error}`);
      socket.emit("chat:error", { message: error.message || "Failed to get group history" });
    }
  });

  // ========== PRESENCE HANDLERS ==========

  /**
   * Check if a user is online
   * Event: chat:check-online
   * Payload: { userId: string }
   */
  socket.on("chat:check-online", async (data: { userId: string }) => {
    try {
      const { userId: targetUserId } = data;
      const online = await isUserOnline(targetUserId);
      socket.emit("chat:online-status", { userId: targetUserId, online });
    } catch (error: any) {
      logger.error(`Error checking online status: ${error}`);
      socket.emit("chat:error", { message: error.message || "Failed to check online status" });
    }
  });

  // ========== TYPING INDICATORS ==========

  /**
   * Send typing indicator for DM
   * Event: chat:typing-dm
   * Payload: { recipientId: string, isTyping: boolean }
   */
  socket.on("chat:typing-dm", (data: { recipientId: string; isTyping: boolean }) => {
    const { recipientId, isTyping } = data;
    socket.to(`user:${recipientId}`).emit("chat:typing", {
      userId,
      recipientId,
      isTyping,
      type: "dm",
    });
  });

  /**
   * Send typing indicator for group
   * Event: chat:typing-group
   * Payload: { groupId: string, isTyping: boolean }
   */
  socket.on("chat:typing-group", (data: { groupId: string; isTyping: boolean }) => {
    const { groupId, isTyping } = data;
    socket.to(`group:${groupId}`).emit("chat:typing", {
      userId,
      groupId,
      isTyping,
      type: "group",
    });
  });

  // ========== DELIVERY CONFIRMATION HANDLERS ==========

  /**
   * Mark message as delivered
   * Event: chat:mark-delivered
   * Payload: { messageId: string, type: 'dm' | 'group' }
   */
  socket.on("chat:mark-delivered", async (data: { messageId: string; type: 'dm' | 'group' }) => {
    try {
      const { messageId, type } = data;
      if (!messageId) {
        socket.emit("chat:error", { message: "messageId is required" });
        return;
      }

      await markMessageDelivered(userId, messageId, type);
      socket.emit("chat:delivered", { messageId });
    } catch (error: any) {
      logger.error(`Error marking message as delivered: ${error}`);
      socket.emit("chat:error", { message: error.message || "Failed to mark message as delivered" });
    }
  });

  /**
   * Mark message as read
   * Event: chat:mark-read
   * Payload: { messageId: string, type: 'dm' | 'group' }
   */
  socket.on("chat:mark-read", async (data: { messageId: string; type: 'dm' | 'group' }) => {
    try {
      const { messageId, type } = data;
      if (!messageId) {
        socket.emit("chat:error", { message: "messageId is required" });
        return;
      }

      await markMessageRead(userId, messageId, type);
      socket.emit("chat:read", { messageId });
    } catch (error: any) {
      logger.error(`Error marking message as read: ${error}`);
      socket.emit("chat:error", { message: error.message || "Failed to mark message as read" });
    }
  });

  /**
   * Get delivery status for messages
   * Event: chat:get-delivery-status
   * Payload: { messageId: string, recipientIds: string[] }
   */
  socket.on("chat:get-delivery-status", async (data: { messageId: string; recipientIds: string[] }) => {
    try {
      const { messageId, recipientIds } = data;
      if (!messageId || !recipientIds || !Array.isArray(recipientIds)) {
        socket.emit("chat:error", { message: "messageId and recipientIds array are required" });
        return;
      }

      const status = await getMessageDeliveryStatus(messageId, recipientIds);
      socket.emit("chat:delivery-status", { messageId, status });
    } catch (error: any) {
      logger.error(`Error getting delivery status: ${error}`);
      socket.emit("chat:error", { message: error.message || "Failed to get delivery status" });
    }
  });

  /**
   * Get list of online users
   * Event: chat:get-online-users
   */
  socket.on("chat:get-online-users", async () => {
    try {
      const onlineUsers = await getOnlineUsers();
      socket.emit("chat:online-users", { users: onlineUsers });
    } catch (error: any) {
      logger.error(`Error getting online users: ${error}`);
      socket.emit("chat:error", { message: error.message || "Failed to get online users" });
    }
  });

  // ========== DISCONNECT HANDLER ==========

  socket.on("disconnect", async () => {
    logger.info(`Socket disconnected for user: ${userId}`);
    await setUserOffline(userId, socket.id).catch((err) => {
      logger.error(`Error setting user offline: ${err}`);
    });
  });
};