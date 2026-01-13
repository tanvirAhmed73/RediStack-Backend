import { NextFunction, Request, Response } from "express";
import appConfig from "../config/app.config";
import { redisConnection } from "../config/redis.config";
import { AppError } from "../utlis/appError";
import { sendError } from "../utlis/helper/response";
import logger from "../utlis/logger";

const config = appConfig();
export const apiRateLimiter = async (req:Request, res:Response, next:NextFunction) => {
    const ip = req.ip;
    try {
        const key = `api:rate_limit${ip}`;
        const requestCount = await redisConnection().incr(key);
        if(requestCount === 1){
            await redisConnection().expire(key, config.api.api_window_second);
        }
        if(requestCount > config.api.api_max_requests){
            throw new AppError("Too many requests", 429);
        }
        next();
    } catch (error) {
        if(error instanceof AppError){
            return sendError(res, error.message, error.statusCode);
        }
        logger.error("Internal server error", error);
        return sendError(res, "Internal server error", 500);
    }
}