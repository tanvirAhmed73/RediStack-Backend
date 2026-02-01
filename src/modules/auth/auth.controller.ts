import { Request, Response } from "express";
import { prisma } from "../../utlis/prisma";
import { createUser, getUserByEmail, getUserById, updateUser, userExists } from "../user/user.repository";
import bcrypt from "bcrypt";
import { AppError } from "../../utlis/appError";
import logger from "../../utlis/logger";
import { sendError, sendSuccess } from "../../utlis/helper/response";
import { sendVerificationEmail } from "../../mail/mail.service";
import { verifyEmailOtp } from "./otp.service";
import { redisConnection } from "../../config/redis.config";
import appConfig from "../../config/app.config";
import { verifyPassword } from "./auth.service";
import { generateAccessToken } from "../../utlis/helper/auth";
import { JwtPayload } from "jsonwebtoken";
import { checkLoginRateLimit, clearLoginAttempts } from "../../rate-limit/loginRateLimiter";
import { createSession, deleteSession, verifyRefreshToken } from "../../sessions/session.service";

const config = appConfig();

// get user details
export const getUserDetails = async (req:Request, res:Response)=>{
    const user = req.user;
    const userId = (user as JwtPayload).sub;
    if (!user) throw new AppError("User not found", 404);
    const userDetails = await getUserById(userId as string);
    if (!userDetails) throw new AppError("User not found", 404);
    const {password, ...userDataWithoutPassword} = userDetails;
    return sendSuccess(res, userDataWithoutPassword, "User fetched successfully", 200);
}

// sign up
export const signUp = async (req:Request ,res:Response)=>{
    const {name, email, password } = req.body;
    if (!name || !email || !password) {
        logger.error("All fields are required ");
        throw new AppError("All fields are required", 400);
    }

    try {
        // check if user already exists
        const existingUser = await userExists(email);
        if (existingUser) {
            logger.error("User already exists with this email");
            throw new AppError("User already exists", 409);
        }

        // hash password
        const hashedPassword = await bcrypt.hash(password, 10);
       
        // create user
        const user = await createUser(name, email, hashedPassword);
        logger.info("User created successfully");

        // // send verification email
        await sendVerificationEmail(email);
        logger.info("Verification email sent successfully");

        return sendSuccess(res, null, "Registration successful.Please check your email to verify your account.", 201);
    } catch (error) {
        // If it's an AppError, send the appropriate error response
        if (error instanceof AppError) {
            logger.error(`AppError: ${error.message}`);
            return sendError(res, error.message, error.statusCode);
        }
        // For unexpected errors, log and send generic error
        logger.error("Internal server error", error);
        return sendError(res, "Internal server error", 500);
    }

}

// verify email by otp
export const verifyEmailByOtp = async (req:Request ,res:Response)=>{
    const { email, otp } = req.body;
    if (!email || !otp) {
        logger.error("All fields are required");
        throw new AppError("All fields are required", 400);
    }
    // check otp is number or not
    if (isNaN(Number(otp))) {
        logger.error("OTP must be a number");
        throw new AppError("OTP must be a number", 400);
    }
    try {
        // check if otp is valid
        const isValidOtp = await verifyEmailOtp(email, otp);
        if (!isValidOtp) {
            logger.error("Invalid OTP");
            throw new AppError("Invalid OTP", 400);
        }

        // update user email verification status
        await updateUser(email, {isVerified: true}, { reason: "OTP verified"});
        logger.info("User email verification status updated successfully");

        return sendSuccess(res, null, "Email verified successfully.You can now login to your account.", 200);
    } catch (error) {
        // If it's an AppError, send the appropriate error response
        if (error instanceof AppError) {
            logger.error(`AppError: ${error.message}`);
            return sendError(res, error.message, error.statusCode);
        }
        // For unexpected errors, log and send generic error
        logger.error("Internal server error", error);
        return sendError(res, "Internal server error", 500);
    }
}

// resend verification email
export const resendOtp = async (req:Request ,res:Response)=>{
    const { email } = req.body;
    if (!email) {
        logger.error("Email is required");
        throw new AppError("Email is required", 400);
    }
    try {
        // check if user exists
        const user = await getUserByEmail(email);
        if (!user) {
            logger.error("User not found");
            throw new AppError("User not found", 404);
        }
        // check if user is verified
        if (user.isVerified) {
            logger.error("User already verified");
            throw new AppError("User already verified", 400);
        }
        // check if user has already requested OTP in the last 1 minute
        const lastOtpRequestTime = await redisConnection().get(`auth:email_otp_request_time:${email}`);
        if (lastOtpRequestTime) {
            logger.error(`User has already requested OTP. Please wait for ${Number(config.mail.otp_validity_time)/60} minute to request again.`);
            throw new AppError(`User has already requested OTP. Please wait for ${Number(config.mail.otp_validity_time)/60} minute to request again.`, 400);
        }
        // send verification email
        await sendVerificationEmail(email);
        logger.info("Verification email sent successfully");
        return sendSuccess(res, null, "Verification email sent successfully", 200);
    }
    catch (error) {
        // If it's an AppError, send the appropriate error response
        if (error instanceof AppError) {
            logger.error(`AppError: ${error.message}`);
            return sendError(res, error.message, error.statusCode);
        }
        // For unexpected errors, log and send generic error
        logger.error("Internal server error", error);
        return sendError(res, "Internal server error", 500);
    }
}

// login
export const login = async (req:Request ,res:Response)=>{
    const { email, password } = req.body;
    // check if email and password are required
    if (!email || !password) {
        logger.error("All fields are required");
        throw new AppError("All fields are required", 400);
    }
    try {
        await checkLoginRateLimit(email);
        // check if user exists
        const user = await getUserByEmail(email);
        if (!user) throw new AppError("Invalid email or password", 401);

        // check if user is verified
        // if (!user.isVerified) throw new AppError("User is not verified. Please verify your email to login.", 401);

        // check if password is correct
        const isPasswordCorrect = await verifyPassword(password as string, user.password as string);
        if (!isPasswordCorrect) throw new AppError("Invalid email or password", 401);

        // create session in redis
        const { sessionId, refreshToken } = await createSession(user.id as string);
        if (!sessionId || !refreshToken) throw new AppError("Failed to create session", 500);

        // generate access token
        const accessToken = generateAccessToken({ sub: user.id as string });
        if (!accessToken) throw new AppError("Failed to generate access token", 401);
        logger.info("Access token generated successfully");

        // prepare data to send
        const { password: _, ...userDataWithoutPassword} = user;

        const data ={
            ...userDataWithoutPassword,
            token:accessToken,
            sessionId,
            refreshToken
        }

        // clear login attempts
        await clearLoginAttempts(email);

        return sendSuccess(res, data, "Login successful", 200);
    }
    catch (error) {
        // If it's an AppError, send the appropriate error response
        if (error instanceof AppError) {
            logger.error(`AppError: ${error.message}`);
            return sendError(res, error.message, error.statusCode);
        }
        // For unexpected errors, log and send generic error
        logger.error("Internal server error", error);
        return sendError(res, "Internal server error", 500);
    }
}

//refresh token
export const refreshToken = async (req:Request ,res:Response)=>{
    const { refreshToken, sessionId } = req.body;   
    if (!refreshToken || !sessionId) {
        logger.error("All fields are required");
        throw new AppError("All fields are required", 400);
    }
    try {
        // check if session exists
        const { userId, refreshToken: storedRefreshToken } = await verifyRefreshToken(sessionId, refreshToken);
        if (!userId || !storedRefreshToken) throw new AppError("Invalid refresh token", 401);

        // check if refresh token is valid create new access token
        const accessToken = generateAccessToken({ sub: userId });
        if (!accessToken) throw new AppError("Failed to generate access token", 401);
        logger.info("Access token generated successfully");

        return sendSuccess(res, { accessToken }, "Access token generated successfully", 200);
    }
    catch (error) {
        // If it's an AppError, send the appropriate error response
        if (error instanceof AppError) {
            logger.error(`AppError: ${error.message}`);
            return sendError(res, error.message, error.statusCode);
        }
        // For unexpected errors, log and send generic error
        logger.error("Internal server error", error);
        return sendError(res, "Internal server error", 500);
    }
}

// logout
export const logout = async (req:Request ,res:Response)=>{
    const { sessionId } = req.body;
    if (!sessionId) {
        logger.error("Session ID is required");
        throw new AppError("Session ID is required", 400);
    }
    try {
        await deleteSession(sessionId);
        return sendSuccess(res, null, "Logout successful", 200);
    }
    catch (error) {
        // If it's an AppError, send the appropriate error response
        if (error instanceof AppError) {
            logger.error(`AppError: ${error.message}`);
            return sendError(res, error.message, error.statusCode);
        }
        // For unexpected errors, log and send generic error
        logger.error("Internal server error", error);
        return sendError(res, "Internal server error", 500);
    }
}