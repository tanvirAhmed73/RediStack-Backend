import { AppError } from "../../utlis/appError";
import logger from "../../utlis/logger";
import { prisma } from "../../utlis/prisma";
import { User } from "@prisma/client";

// check if user exists by email, return true if exists else false
export const userExists = async (email:string)=>{
    const user = await prisma.user.findUnique({
        where: { email }
    });
    return !!user;
}

// create a new user in the database, return the user if created successfully else throw an error
export const createUser = async (name:string, email:string, password:string)=>{
    const user = await prisma.user.create({
        data: { name, email, password }
    })
    return user;
}


// get user by email, return the user if found else throw an error
export const getUserByEmail = async (email:string)=>{
    const user = await prisma.user.findUnique({
        where: { email }
    })
    if (!user) {
        logger.error(`User not found: ${email}`);
        throw new AppError("User not found", 404);
    }
    // remove password from user
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
}

// update user data in the database, return the user if updated successfully else throw an error
export const updateUser = async (email:string, data:Partial<User>, meta?:{ reason:string }):Promise<User>=>{
    const user = await prisma.user.update({
        where: { email },
        data: data
    })

    if (meta?.reason) {
        logger.info(`User updated successfully: reason: ${meta.reason}`);
    }
    return user;
}