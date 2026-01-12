import appConfig from "../config/app.config";
import jwt, { SignOptions } from "jsonwebtoken";
import crypto from "crypto";

const config = appConfig();
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

