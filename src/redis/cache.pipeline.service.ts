import { getRedisConnection } from "../config/redis.config";
import { AppError } from "../utlis/appError";
import logger from "../utlis/logger";

export const batchSet = async (items: {key:string, value:any, ttl:number}[]) =>{
    try {
        const pipeline = getRedisConnection().multi();
        items.forEach(({key, value, ttl}) => {
            pipeline.set(key, JSON.stringify(value), "EX", ttl);
        });
        await pipeline.exec();
    } catch (error) {
        logger.error("Error in batchSet", error);
        throw new AppError("Failed to set cache in batch", 500);
    }
    
}