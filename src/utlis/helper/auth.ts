import appConfig from "../../config/app.config";
import { AppError } from "../appError";
import jwt, { SignOptions } from "jsonwebtoken";
import crypto from "crypto";

const config = appConfig();
export const verifyAccessToken = async (token:string)=>{
    const secret = config.jwt.secret;
    if (!secret) {
        throw new AppError("JWT_SECRET is not configured", 500);
    }
    const decoded = await jwt.verify(token, secret);
    return decoded;
}


interface TokenPayload {
    sub: string; // user id
}

export const generateAccessToken = (payload: TokenPayload)=>{
    const secret = config.jwt.secret;
    if (!secret) {
        throw new Error("JWT_SECRET is not defined in environment variables");
    }
    
    const expiresIn = config.jwt.expiresIn || "24h";
    return jwt.sign(payload, secret, { expiresIn } as SignOptions);
}

export const generateRefreshToken = ()=>{
    return crypto.randomBytes(64).toString("hex");
}

