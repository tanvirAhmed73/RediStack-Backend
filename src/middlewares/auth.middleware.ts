import appConfig from "../config/app.config";
import { AppError } from "../utlis/appError";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import logger from "../utlis/logger";
import { sendError } from "../utlis/helper/response";
import { verifyAccessToken } from "../utlis/helper/auth";

const config = appConfig();
export const authenticate = async (req:Request, res:Response, next:NextFunction)=>{
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) throw new AppError("Unauthorized", 401);
    
    try {
        const decoded = await verifyAccessToken(token);
        if (!decoded) throw new AppError("Unauthorized", 401);
        req.user = decoded;
        next();

    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            logger.error(`JWT Error: ${error.message}`);
            return sendError(res, "Invalid token", 401);
        }
        if (error instanceof jwt.TokenExpiredError) {
            logger.error(`JWT Error: Token expired`);
            return sendError(res, "Token expired", 401);
        }
        if (error instanceof AppError) {
            logger.error(`AppError: ${error.message}`);
            return sendError(res, error.message, error.statusCode);
        }
        logger.error("Internal server error", error);
        return sendError(res, "Internal server error", 500);
    }
}