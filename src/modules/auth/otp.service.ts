import { redisConnection } from "../../config/redis.config"
import { hashOtp } from "../../utlis/helper/generateRandomOtp"
import logger from "../../utlis/logger"
import appConfig from "../../config/app.config"
import { AppError } from "../../utlis/appError";

const config = appConfig();
const MAX_REQ_OTP_ATTEMPTS = Number(config.mail.max_req_otp_attempt);
const ATTEMPT_LIMIT_WINDOW_TIME = Number(config.mail.attempt_limit_window_time);

export const saveEmailVerificationOtp = async(email:string, verificationOtp:string, expireTime:number)=>{
    const hashedOtp = hashOtp(verificationOtp)
    
    const result = await redisConnection().set(
        `auth:email_verify_otp:${email}`,
        hashedOtp,
        "EX",
        expireTime
    )

    // save the current time as the last OTP request time
    await redisConnection().set(`auth:email_otp_request_time:${email}`, Date.now().toString(), "EX", expireTime);

    logger.info(`Email Verification OTP Saved Successfully: ${result}`);

    // attemt reset otp if new otp is generated
    await redisConnection().del(`auth:email_otp_attempt:${email}`)
}

export const verifyEmailOtp = async(email:string, otp:string)=>{
    const otpKey = `auth:email_verify_otp:${email}`
    const attemptsKey = `auth:email_otp_attempt:${email}`

    const storedHashedotpKey = await redisConnection().get(otpKey)
    if (!storedHashedotpKey) {
        throw new AppError("Invalid OTP", 400);
    }

    // Increas attempt count
    const attempts = await redisConnection().incr(attemptsKey)

    // Set expiration for attempts
    if (attempts === 1) {
        await redisConnection().expire(attemptsKey, ATTEMPT_LIMIT_WINDOW_TIME)
    }

    // Check if maximum attempts reached
    if (attempts > MAX_REQ_OTP_ATTEMPTS) {
        throw new AppError(`Too many attempts. Please resend the OTP after ${ATTEMPT_LIMIT_WINDOW_TIME/60} minutes.`, 400);
    }
    
    // Check if OTP is valid
    const hashedOtp = hashOtp(otp)
    if (storedHashedotpKey === hashedOtp) {
        // Delete OTP after successful verification
        await redisConnection().del(otpKey)
        // Reset attempts count
        await redisConnection().del(attemptsKey)
        return true
    }
    throw new AppError("Invalid OTP", 400);
}

