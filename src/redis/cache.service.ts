import { getRedisConnection, redisConnection } from "../config/redis.config"
import { AppError } from "../utlis/appError";
import logger from "../utlis/logger";


export const getCache = async (key:string) =>{
    try {
        const data = await getRedisConnection().get(key);
        return data? JSON.parse(data) : null;
    } catch (error) {
        logger.error("Error in getCache", error);
        throw new AppError("Failed to get cache", 500);
    }
}

export const setCachewithTTL = async (key:string, value:any, ttl:number) =>{
    try {
        await getRedisConnection().set(key, JSON.stringify(value), "EX", ttl);
    } catch (error) {
        logger.error("Error in setCachewithTTL", error);
        throw new AppError("Failed to set cache with TTL", 500);
    }
}

export const setCacheWithoutTTL = async (key:string, value:any) => {
    try {
        await redisConnection().set(key, value);
    } catch (error) {
        logger.error("Error in setCacheWithoutTTL", error);
        throw new AppError("Failed to set cache without TTL", 500);
    }
}

export const deleteCache = async (key:string)=>{
    try {
        await redisConnection().del(key);
    } catch (error) {
        logger.error("Error in deleteCache", error);
        throw new AppError("Failed to delete cache", 500);
    }
}