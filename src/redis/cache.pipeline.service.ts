import { getRedisConnection } from "../config/redis.config";

export const batchSet = async (items: {key:string, value:any, ttl:number}[]) =>{
    const pipeline = getRedisConnection().multi();
    items.forEach(({key, value, ttl}) => {
        pipeline.set(key, JSON.stringify(value), "EX", ttl);
    });
    await pipeline.exec();
}