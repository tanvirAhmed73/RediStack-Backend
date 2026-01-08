import { Request, Response } from "express";
import { prisma } from "../../utlis/prisma";
import { createUser, userExists } from "../user/user.repository";
import bcrypt from "bcrypt";
import { AppError } from "../../utlis/appError";
import logger from "../../utlis/logger";
import { sendError, sendSuccess } from "../../utlis/helper/response";
import { sendVerificationEmail } from "../../mail/mail.service";

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

        // send verification email
        await sendVerificationEmail(email);
        logger.info("Verification email sent successfully");

        return sendSuccess(res, null, "Registration successful.Please check your email to verify your account.", 201);
    } catch (error) {
        logger.error("Internal server error");
        return sendError(res, "Internal server error", 500);
    }

}