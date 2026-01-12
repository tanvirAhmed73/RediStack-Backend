import { generateRandomOtp } from "../utlis/helper/generateRandomOtp";
import logger from "../utlis/logger";
import { emailQueue } from "./email.queue";
import appConfig from "../config/app.config";
import { saveEmailVerificationOtp } from "../modules/auth/otp.service";

const config = appConfig();

export const sendVerificationEmail = async (email:string)=>{
    const verificationOtp = generateRandomOtp();
    logger.info(`Email Verification OTP Generated Successfully`);
    
    const from = `${config.app.name} <${config.mail.mail_from}>`;
    const subject = "Verify your email";
    const otpexpireTime = Number(config.mail.otp_validity_time);

    // saving otp in redis
    await saveEmailVerificationOtp(email, verificationOtp, otpexpireTime)

    await emailQueue.add("send-verification-email", {
        from,
        to:email,
        subject,
        context: {
            expireTime: otpexpireTime,
            verificationOtp,
        },
    });
    logger.info("Added job to email queue successfully");
}