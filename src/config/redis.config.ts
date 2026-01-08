import IORedis, { Redis } from "ioredis";
import appConfig from "./app.config";
import logger from "../utlis/logger";

const config = appConfig();

// Singleton pattern to ensure only one Redis connection instance
let redisInstance: Redis | null = null;

/**
 * Get or create Redis connection instance
 * Implements singleton pattern for scalability
 */
export function getRedisConnection(): Redis {
  if (redisInstance) {
    return redisInstance;
  }

  // Build connection options conditionally
  // Only include password if it's actually set in environment variable
  // This prevents the warning when Redis doesn't require a password
  const connectionOptions: any = {
    host: config.redis.host,
    port: Number(config.redis.port),
    lazyConnect: true,
    retryStrategy: (times: number) => {
      // Exponential backoff: 50ms, 100ms, 200ms, 400ms, 800ms, max 3000ms
      const delay = Math.min(times * 50, 3000);
      logger.warn(`Redis reconnecting in ${delay}ms (attempt ${times})`);
      return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    enableOfflineQueue: false, // Don't queue commands when offline
    connectTimeout: 10000, // 10 seconds
    commandTimeout: 5000, // 5 seconds
  };

  // Only add password if environment variable is explicitly set and not empty
  // Check process.env directly to avoid default 'root' value from app.config
  // This prevents the warning when Redis doesn't require a password
  const redisPassword = process.env.REDIS_PASSWORD;
  if (redisPassword && redisPassword.trim() !== '') {
    // Only include password if it's actually set in environment
    // This way, if REDIS_PASSWORD is not set, the password field won't be included
    connectionOptions.password = redisPassword;
  }
  // If REDIS_PASSWORD is undefined or empty, password field is omitted entirely

  redisInstance = new IORedis(connectionOptions);

  // Event handlers for connection lifecycle
  redisInstance.on('connect', () => {
    logger.info('Redis: Connecting...');
  });

  redisInstance.on('ready', () => {
    logger.info('Redis: Connection ready');
  });

  redisInstance.on('error', (error) => {
    logger.error('Redis: Connection error', error);
  });

  redisInstance.on('close', () => {
    logger.warn('Redis: Connection closed');
  });

  redisInstance.on('reconnecting', (delay: number) => {
    logger.info(`Redis: Reconnecting in ${delay}ms...`);
  });

  redisInstance.on('end', () => {
    logger.warn('Redis: Connection ended');
  });

  return redisInstance;
}

/**
 * Initialize Redis connection
 * Call this during application bootstrap
 */
export async function connectRedis(): Promise<void> {
  const connection = getRedisConnection();
  
  if (connection.status === 'ready') {
    logger.info('Redis: Already connected');
    return;
  }

  if (connection.status === 'connecting') {
    logger.info('Redis: Connection in progress, waiting...');
    await new Promise((resolve) => {
      connection.once('ready', resolve);
      connection.once('error', resolve);
    });
    return;
  }

  try {
    await connection.connect();
    logger.info('Redis: Successfully connected');
  } catch (error) {
    logger.error('Redis: Failed to connect', error);
    throw error;
  }
}

/**
 * Gracefully close Redis connection
 * Call this during application shutdown
 */
export async function disconnectRedis(): Promise<void> {
  if (!redisInstance) {
    return;
  }

  try {
    await redisInstance.quit();
    logger.info('Redis: Connection closed gracefully');
  } catch (error) {
    logger.error('Redis: Error during disconnect', error);
    // Force disconnect if quit fails
    redisInstance.disconnect();
  } finally {
    redisInstance = null;
  }
}

/**
 * Check if Redis connection is healthy
 */
export function isRedisHealthy(): boolean {
  if (!redisInstance) {
    return false;
  }
  return redisInstance.status === 'ready';
}

export const redisConnection = getRedisConnection;