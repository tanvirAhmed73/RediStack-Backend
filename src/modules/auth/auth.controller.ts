import { Request, Response } from "express";
import { prisma } from "../../utlis/prisma";
import { createUser, getUserByEmail, updateUser, userExists } from "../user/user.repository";
import bcrypt from "bcrypt";
import { AppError } from "../../utlis/appError";
import logger from "../../utlis/logger";
import { sendError, sendSuccess } from "../../utlis/helper/response";
import { sendVerificationEmail } from "../../mail/mail.service";
import { verifyEmailOtp } from "./otp.service";


export const getUserDetails = async (req:Request, res:Response)=>{
    // TODO: get user details from the request by token
    try {
        // const user = await getUserByEmail(email);
        // return sendSuccess(res, user, "User fetched successfully", 200);
    } catch (error) {
        if (error instanceof AppError) {
            logger.error(`AppError: ${error.message}`);
            return sendError(res, error.message, error.statusCode);
        }
    }
}

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


export const verifyEmailByOtp = async (req:Request ,res:Response)=>{
    const { email, otp } = req.body;
    if (!email || !otp) {
        logger.error("All fields are required");
        throw new AppError("All fields are required", 400);
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