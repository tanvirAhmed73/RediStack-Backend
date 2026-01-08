import appConfig from "./app.config";

const config = appConfig();

export function getBullConnection() {
    const connectionOptions: any = {
        host: config.redis.host,
        port: Number(config.redis.port),
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

    return connectionOptions;
}
