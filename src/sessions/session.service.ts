import { redisConnection } from "../config/redis.config";
import { generateRefreshToken } from "../utlis/token";
import crypto from "crypto";
import appConfig from "../config/app.config";
import { AppError } from "../utlis/appError";

const config = appConfig();

export const createSession = async (userId:string) => {
    const sessionId = crypto.randomUUID();
    const refreshToken = generateRefreshToken();

    // store userId + refreshToken in redis
    const sessionData = {
        userId,
        refreshToken
    }


    await redisConnection().set(`auth:refresh_token:${sessionId}`, JSON.stringify(sessionData), "EX", config.jwt.refresh_token_ttl)
    
    return { sessionId, refreshToken };
}

export const verifyRefreshToken = async (sessionId:string, storedRefreshToken:string) => {
    const session = await redisConnection().get(`auth:refresh_token:${sessionId}`);
    if (!session) throw new AppError("Session not found", 404);
    const { refreshToken, userId } = JSON.parse(session);
    if (refreshToken !== storedRefreshToken) throw new AppError("Invalid refresh token", 401);
    return { userId, refreshToken };
}

export const deleteSession = async (sessionId:string) => {
    await redisConnection().del(`auth:refresh_token:${sessionId}`);
    return true;
}