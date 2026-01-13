import IORedis, { Redis } from "ioredis";
import appConfig from "../config/app.config";
import logger from "../utlis/logger";
import { getIO } from "../socket";

const config = appConfig();

// Separate Redis connection for Pub/Sub (required by Redis)
let redisSubscriber: Redis | null = null;
let redisPublisher: Redis | null = null;

/**
 * Initialize Redis Pub/Sub connections
 * Pub/Sub requires dedicated connections (cannot use same connection for commands and pub/sub)
 */
export async function initChatPubSub(): Promise<void> {
  const connectionOptions: any = {
    host: config.redis.host,
    port: Number(config.redis.port),
    lazyConnect: true,
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 3000);
      logger.warn(`Redis Pub/Sub reconnecting in ${delay}ms (attempt ${times})`);
      return delay;
    },
  };

  const redisPassword = process.env.REDIS_PASSWORD;
  if (redisPassword && redisPassword.trim() !== '') {
    connectionOptions.password = redisPassword;
  }

  // Create subscriber connection
  redisSubscriber = new IORedis(connectionOptions);
  redisSubscriber.on('error', (error) => {
    logger.error('Redis Subscriber error:', error);
  });

  // Create publisher connection
  redisPublisher = new IORedis(connectionOptions);
  redisPublisher.on('error', (error) => {
    logger.error('Redis Publisher error:', error);
  });

  await redisSubscriber.connect();
  await redisPublisher.connect();

  logger.info('Redis Pub/Sub connections initialized');

  // Subscribe to all chat channels pattern
  setupChatSubscriptions();
}

/**
 * Setup Redis subscriptions for chat messages
 */
function setupChatSubscriptions(): void {
  if (!redisSubscriber) {
    throw new Error('Redis subscriber not initialized');
  }

  // Subscribe to direct message channels (pattern: chat:dm:*)
  redisSubscriber.psubscribe('chat:dm:*', (err, count) => {
    if (err) {
      logger.error('Error subscribing to DM channels:', err);
    } else {
      logger.info(`Subscribed to ${count} DM channel patterns`);
    }
  });

  // Subscribe to group chat channels (pattern: chat:group:*)
  redisSubscriber.psubscribe('chat:group:*', (err, count) => {
    if (err) {
      logger.error('Error subscribing to group channels:', err);
    } else {
      logger.info(`Subscribed to ${count} group channel patterns`);
    }
  });

  // Subscribe to notification channels (pattern: notifications:*)
  redisSubscriber.psubscribe('notifications:*', (err, count) => {
    if (err) {
      logger.error('Error subscribing to notification channels:', err);
    } else {
      logger.info(`Subscribed to ${count} notification channel patterns`);
    }
  });

  // Handle incoming messages from Redis Pub/Sub
  redisSubscriber.on('pmessage', (pattern, channel, message) => {
    try {
      const messageData = JSON.parse(message);
      const io = getIO();

      if (pattern.startsWith('chat:dm:')) {
        // Direct message: channel format is chat:dm:{userId1}:{userId2}
        const [, , userId1, userId2] = channel.split(':');
        const recipients = [userId1, userId2];

        // Emit to both users' socket rooms
        recipients.forEach((userId) => {
          io.to(`user:${userId}`).emit('chat:message', {
            type: 'dm',
            channel,
            ...messageData,
          });
        });

        logger.info(`DM sent from ${messageData.senderId} to ${recipients.join(', ')}`);
      } else if (pattern.startsWith('chat:group:')) {
        // Group message: channel format is chat:group:{groupId}
        const [, , groupId] = channel.split(':');

        // Emit to all users in the group room
        io.to(`group:${groupId}`).emit('chat:message', {
          type: 'group',
          channel,
          groupId,
          ...messageData,
        });

        logger.info(`Group message sent to group ${groupId} from ${messageData.senderId}`);
      } else if (pattern.startsWith('notifications:')) {
        // Notification: channel format is notifications:{userId}
        const [, userId] = channel.split(':');

        // Emit to specific user
        io.to(`user:${userId}`).emit('notification', messageData);

        logger.info(`Notification sent to user ${userId}`);
      }
    } catch (error) {
      logger.error('Error processing Pub/Sub message:', error);
    }
  });
}

/**
 * Publish a direct message to Redis Pub/Sub
 */
export function publishDirectMessage(
  senderId: string,
  recipientId: string,
  message: string,
  metadata?: Record<string, any>
): void {
  if (!redisPublisher) {
    throw new Error('Redis publisher not initialized');
  }

  // Create consistent channel name (sorted IDs to ensure same channel for both users)
  const channel = `chat:dm:${[senderId, recipientId].sort().join(':')}`;

  const messageData = {
    senderId,
    recipientId,
    message,
    timestamp: Date.now(),
    messageId: metadata?.messageId, // Include messageId for delivery tracking
    ...metadata,
  };

  redisPublisher.publish(channel, JSON.stringify(messageData));
  logger.info(`Published DM to channel ${channel}`);
}

/**
 * Publish a group message to Redis Pub/Sub
 */
export function publishGroupMessage(
  senderId: string,
  groupId: string,
  message: string,
  metadata?: Record<string, any>
): void {
  if (!redisPublisher) {
    throw new Error('Redis publisher not initialized');
  }

  const channel = `chat:group:${groupId}`;

  const messageData = {
    senderId,
    groupId,
    message,
    timestamp: Date.now(),
    messageId: metadata?.messageId, // Include messageId for delivery tracking
    ...metadata,
  };

  redisPublisher.publish(channel, JSON.stringify(messageData));
  logger.info(`Published group message to channel ${channel}`);
}

/**
 * Publish a notification to Redis Pub/Sub
 */
export function publishNotification(
  userId: string,
  notification: {
    type: string;
    title: string;
    message: string;
    data?: Record<string, any>;
  }
): void {
  if (!redisPublisher) {
    throw new Error('Redis publisher not initialized');
  }

  const channel = `notifications:${userId}`;

  const notificationData = {
    ...notification,
    timestamp: Date.now(),
  };

  redisPublisher.publish(channel, JSON.stringify(notificationData));
  logger.info(`Published notification to user ${userId}`);
}

/**
 * Close Pub/Sub connections
 */
export async function closeChatPubSub(): Promise<void> {
  if (redisSubscriber) {
    await redisSubscriber.quit();
    redisSubscriber = null;
  }
  if (redisPublisher) {
    await redisPublisher.quit();
    redisPublisher = null;
  }
  logger.info('Redis Pub/Sub connections closed');
}
