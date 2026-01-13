import { getRedisConnection, redisConnection } from "../config/redis.config"


export const getCache = async (key:string) =>{
    const data = await getRedisConnection().get(key);
    return data? JSON.parse(data) : null;
}

export const setCachewithTTL = async (key:string, value:any, ttl:number) =>{
    await getRedisConnection().set(key, JSON.stringify(value), "EX", ttl);
}

export const setCacheWithoutTTL = async (key:string, value:any) => {
    await redisConnection().set(key, value);
}

export const deleteCache = async (key:string)=>{
    await redisConnection().del(key);
}