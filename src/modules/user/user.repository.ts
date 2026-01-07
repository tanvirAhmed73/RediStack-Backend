import { prisma } from "../../utlis/prisma";


export const userExists = async (email:string)=>{
    const user = await prisma.user.findUnique({
        where: { email }
    });
    return !!user;
}


export const createUser = async (name:string, email:string, password:string)=>{
    const user = await prisma.user.create({
        data: { name, email, password }
    })
    return user;
}
