import { redisConnection } from "../config/redis.config";
import logger from "../utlis/logger";
import { publishDirectMessage, publishGroupMessage, publishNotification } from "./chat.pubsub";

/**
 * Generate a consistent room ID for direct messages between two users
 */
export function getDirectMessageRoomId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join(':');
}

/**
 * Store message in Redis Streams for history and delivery tracking
 * Redis Streams provide:
 * - Automatic ordering by timestamp
 * - Consumer groups for delivery confirmation
 * - Efficient range queries
 */
export async function storeMessage(
  type: 'dm' | 'group',
  senderId: string,
  recipientIdOrGroupId: string,
  message: string,
  metadata?: Record<string, any>
): Promise<string> {
  const redis = redisConnection();
  const timestamp = Date.now();

  const messageData = {
    type,
    senderId,
    recipientId: type === 'dm' ? recipientIdOrGroupId : undefined,
    groupId: type === 'group' ? recipientIdOrGroupId : undefined,
    message,
    timestamp: timestamp.toString(),
    status: 'sent', // sent, delivered, read
    ...metadata,
  };

  let streamKey: string;

  if (type === 'dm') {
    const roomId = getDirectMessageRoomId(senderId, recipientIdOrGroupId);
    streamKey = `chat:stream:dm:${roomId}`;
  } else {
    streamKey = `chat:stream:group:${recipientIdOrGroupId}`;
  }

  // Add message to Redis Stream
  // XADD automatically generates a unique ID based on timestamp
  const messageId = await redis.xadd(
    streamKey,
    '*', // Auto-generate ID
    'type', messageData.type,
    'senderId', messageData.senderId,
    'message', messageData.message,
    'timestamp', messageData.timestamp,
    'status', messageData.status,
    ...(messageData.recipientId ? ['recipientId', messageData.recipientId] : []),
    ...(messageData.groupId ? ['groupId', messageData.groupId] : []),
    ...(metadata ? ['metadata', JSON.stringify(metadata)] : [])
  );

  if (!messageId) {
    throw new Error('Failed to add message to Redis stream');
  }

  // Trim stream to keep last 10000 messages (much more efficient than sorted sets)
  await redis.xtrim(streamKey, 'MAXLEN', '~', 10000);

  logger.info(`Message stored in stream ${streamKey} with ID ${messageId}`);

  return messageId;
}

/**
 * Get message history for a direct message conversation using Redis Streams
 */
export async function getDirectMessageHistory(
  userId1: string,
  userId2: string,
  limit: number = 50
): Promise<any[]> {
  const redis = redisConnection();
  const roomId = getDirectMessageRoomId(userId1, userId2);
  const streamKey = `chat:stream:dm:${roomId}`;

  // Read last N messages from stream (XREVRANGE reads in reverse)
  const messages = await redis.xrevrange(streamKey, '+', '-', 'COUNT', limit);

  return messages.map(([id, fields]) => {
    const message: any = { id, streamId: id };
    // Convert array of [key, value, key, value...] to object
    for (let i = 0; i < fields.length; i += 2) {
      const key = fields[i];
      const value = fields[i + 1];
      if (key === 'metadata' && value) {
        try {
          message[key] = JSON.parse(value);
        } catch {
          message[key] = value;
        }
      } else {
        message[key] = value;
      }
    }
    return message;
  }).reverse(); // Reverse to get chronological order
}

/**
 * Get message history for a group using Redis Streams
 */
export async function getGroupMessageHistory(
  groupId: string,
  limit: number = 50
): Promise<any[]> {
  const redis = redisConnection();
  const streamKey = `chat:stream:group:${groupId}`;

  // Read last N messages from stream
  const messages = await redis.xrevrange(streamKey, '+', '-', 'COUNT', limit);

  return messages.map(([id, fields]) => {
    const message: any = { id, streamId: id };
    // Convert array of [key, value, key, value...] to object
    for (let i = 0; i < fields.length; i += 2) {
      const key = fields[i];
      const value = fields[i + 1];
      if (key === 'metadata' && value) {
        try {
          message[key] = JSON.parse(value);
        } catch {
          message[key] = value;
        }
      } else {
        message[key] = value;
      }
    }
    return message;
  }).reverse(); // Reverse to get chronological order
}

/**
 * Send a direct message
 */
export async function sendDirectMessage(
  senderId: string,
  recipientId: string,
  message: string,
  metadata?: Record<string, any>
): Promise<void> {
  // Store message history
  await storeMessage('dm', senderId, recipientId, message, metadata);

  // Publish via Redis Pub/Sub
  publishDirectMessage(senderId, recipientId, message, metadata);

  // Send notification to recipient if they're not in the same room
  publishNotification(recipientId, {
    type: 'new_message',
    title: 'New Message',
    message: `You have a new message`,
    data: { senderId, message },
  });
}

/**
 * Send a group message
 * Returns message ID for delivery tracking
 */
export async function sendGroupMessage(
  senderId: string,
  groupId: string,
  message: string,
  metadata?: Record<string, any>
): Promise<string> {
  // Store message in Redis Stream
  const messageId = await storeMessage('group', senderId, groupId, message, metadata);

  // Publish via Redis Pub/Sub
  publishGroupMessage(senderId, groupId, message, { ...metadata, messageId });

  // Get group members and track pending deliveries
  const groupMembers = await getGroupMembers(groupId);
  for (const memberId of groupMembers) {
    if (memberId !== senderId) {
      await trackPendingDelivery('group', memberId, messageId, senderId, groupId);
    }
  }

  return messageId;
}

/**
 * Track user online status using Redis Sets
 * Sets provide O(1) membership checks and efficient set operations
 */
export async function setUserOnline(userId: string, socketId: string): Promise<void> {
  const redis = redisConnection();
  
  // Store socket ID with TTL
  await redis.set(`user:online:${userId}`, socketId, 'EX', 3600); // 1 hour TTL
  
  // Add to online users set
  await redis.sadd('users:online', userId);
  
  // Track user's active sessions (user can have multiple devices)
  await redis.sadd(`user:sessions:${userId}`, socketId);
  await redis.expire(`user:sessions:${userId}`, 3600);
  
  logger.info(`User ${userId} is now online (socket: ${socketId})`);
}

/**
 * Track user offline status
 */
export async function setUserOffline(userId: string, socketId?: string): Promise<void> {
  const redis = redisConnection();
  
  if (socketId) {
    // Remove specific session
    await redis.srem(`user:sessions:${userId}`, socketId);
    
    // Check if user has any remaining sessions
    const remainingSessions = await redis.scard(`user:sessions:${userId}`);
    
    if (remainingSessions === 0) {
      // No more sessions, mark user as offline
      await redis.del(`user:online:${userId}`);
      await redis.del(`user:sessions:${userId}`);
      await redis.srem('users:online', userId);
      logger.info(`User ${userId} is now offline`);
    }
  } else {
    // Remove all sessions
    await redis.del(`user:online:${userId}`);
    await redis.del(`user:sessions:${userId}`);
    await redis.srem('users:online', userId);
    logger.info(`User ${userId} is now offline (all sessions)`);
  }
}

/**
 * Check if user is online
 */
export async function isUserOnline(userId: string): Promise<boolean> {
  const redis = redisConnection();
  const exists = await redis.exists(`user:online:${userId}`);
  return exists === 1;
}

/**
 * Get online users count using Set cardinality
 */
export async function getOnlineUsersCount(): Promise<number> {
  const redis = redisConnection();
  return await redis.scard('users:online');
}

/**
 * Get list of online user IDs
 */
export async function getOnlineUsers(): Promise<string[]> {
  const redis = redisConnection();
  return await redis.smembers('users:online');
}

/**
 * Check if multiple users are online (batch check)
 */
export async function areUsersOnline(userIds: string[]): Promise<Record<string, boolean>> {
  const redis = redisConnection();
  const result: Record<string, boolean> = {};
  
  // Use pipeline for efficient batch operations
  const pipeline = redis.pipeline();
  userIds.forEach(userId => {
    pipeline.exists(`user:online:${userId}`);
  });
  
  const responses = await pipeline.exec();
  userIds.forEach((userId, index) => {
    result[userId] = responses?.[index]?.[1] === 1;
  });
  
  return result;
}

/**
 * Track pending message delivery for a user
 * Used for delivery confirmation tracking
 */
async function trackPendingDelivery(
  type: 'dm' | 'group',
  userId: string,
  messageId: string,
  senderId: string,
  groupId?: string
): Promise<void> {
  const redis = redisConnection();
  const key = `user:pending:${userId}`;
  
  await redis.sadd(key, JSON.stringify({
    type,
    messageId,
    senderId,
    groupId,
    timestamp: Date.now(),
    status: 'pending'
  }));
  
  await redis.expire(key, 86400); // 24 hours TTL
}

/**
 * Mark message as delivered
 */
export async function markMessageDelivered(
  userId: string,
  messageId: string,
  type: 'dm' | 'group'
): Promise<void> {
  const redis = redisConnection();
  const pendingKey = `user:pending:${userId}`;
  
  // Remove from pending set
  const pendingMessages = await redis.smembers(pendingKey);
  for (const msg of pendingMessages) {
    const msgData = JSON.parse(msg);
    if (msgData.messageId === messageId) {
      await redis.srem(pendingKey, msg);
      break;
    }
  }
  
  // Update message status in stream
  // Note: Streams are append-only, so we track delivery status separately
  await redis.set(`message:delivered:${messageId}:${userId}`, 'true', 'EX', 86400);
  
  logger.info(`Message ${messageId} marked as delivered to ${userId}`);
}

/**
 * Mark message as read
 */
export async function markMessageRead(
  userId: string,
  messageId: string,
  type: 'dm' | 'group'
): Promise<void> {
  const redis = redisConnection();
  
  // Mark as read
  await redis.set(`message:read:${messageId}:${userId}`, 'true', 'EX', 86400);
  
  logger.info(`Message ${messageId} marked as read by ${userId}`);
}

/**
 * Get delivery status for a message
 */
export async function getMessageDeliveryStatus(
  messageId: string,
  recipientIds: string[]
): Promise<Record<string, { delivered: boolean; read: boolean }>> {
  const redis = redisConnection();
  const result: Record<string, { delivered: boolean; read: boolean }> = {};
  
  const pipeline = redis.pipeline();
  recipientIds.forEach(userId => {
    pipeline.exists(`message:delivered:${messageId}:${userId}`);
    pipeline.exists(`message:read:${messageId}:${userId}`);
  });
  
  const responses = await pipeline.exec();
  recipientIds.forEach((userId, index) => {
    const deliveredIndex = index * 2;
    const readIndex = index * 2 + 1;
    result[userId] = {
      delivered: responses?.[deliveredIndex]?.[1] === 1,
      read: responses?.[readIndex]?.[1] === 1
    };
  });
  
  return result;
}

/**
 * Get group members (stored in Redis Set)
 */
export async function getGroupMembers(groupId: string): Promise<string[]> {
  const redis = redisConnection();
  return await redis.smembers(`group:members:${groupId}`);
}

/**
 * Add member to group
 */
export async function addGroupMember(groupId: string, userId: string): Promise<void> {
  const redis = redisConnection();
  await redis.sadd(`group:members:${groupId}`, userId);
}

/**
 * Remove member from group
 */
export async function removeGroupMember(groupId: string, userId: string): Promise<void> {
  const redis = redisConnection();
  await redis.srem(`group:members:${groupId}`, userId);
}
