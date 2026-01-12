import { redisConnection } from "../config/redis.config";
import { AppError } from "../utlis/appError";

export const checkLoginRateLimit = async (email:string) => {
    const key = `auth:login_attempts:${email}`;
    const attempts =  await redisConnection().incr(key);

    if(attempts === 1){
        await redisConnection().expire(key, 300);
    }

    if(attempts > 5 ) {
        const ttl = await redisConnection().ttl(key);
        throw new AppError(`Too many login attempts. Please try again after ${Math.ceil(ttl/60)} minutes.`, 429);
    }
}

export const clearLoginAttempts = async(email:string) =>{
    const key = `auth:login_attempts:${email}`;
    await redisConnection().del(key);
}