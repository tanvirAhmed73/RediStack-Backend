import bcrypt from "bcrypt";

// verify password
export const verifyPassword = async (password:string, hashedPassword:string)=>{
    return await bcrypt.compare(password, hashedPassword);
}